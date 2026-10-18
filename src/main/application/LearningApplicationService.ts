import { inject, injectable } from 'tsyringe'
import {
  DI_TOKENS,
  ILexiconRepository,
  IProfileRepository,
  IStudyRepository
} from '@main/domain/repositories'
import { SM2Service } from '@main/domain/services/SM2Service'
import { AnswerEvaluator } from '@main/domain/services/AnswerEvaluator'
import { GamificationService } from '@main/domain/services/GamificationService'
import {
  AnswerEvaluationDTO,
  StartSessionInput,
  SubmitAnswerInput,
  TrainingItemDTO,
  VocabularyDTO
} from '@shared/dto'

@injectable()
export class LearningApplicationService {
  constructor(
    @inject(DI_TOKENS.LexiconRepository) private readonly lexiconRepo: ILexiconRepository,
    @inject(DI_TOKENS.StudyRepository) private readonly studyRepo: IStudyRepository,
    @inject(DI_TOKENS.ProfileRepository) private readonly profileRepo: IProfileRepository,
    @inject(SM2Service) private readonly sm2: SM2Service,
    @inject(AnswerEvaluator) private readonly evaluator: AnswerEvaluator,
    @inject(GamificationService) private readonly gamification: GamificationService
  ) {}

  public async startSession(input: StartSessionInput): Promise<TrainingItemDTO[]> {
    // Always fetch the full pool for the chosen language/folder/tag so that
    // started cards in the consolidation phase (masteryLevel < 2) are never
    // hidden behind unseen cards whose initial nextReviewAt is <= now.
    const pool = await this.lexiconRepo.getVocabularies({
      sourceLanguageId: input.sourceLanguageId,
      targetLanguageId: input.targetLanguageId,
      categoryId: input.categoryId,
      tagId: input.tagId
    })

    const limit = input.limit ?? 15
    const focusMode = input.focusMode ?? 'CONSOLIDATE_FIRST'
    const selected = this.selectCardsForSession(pool, limit, focusMode, new Date())
    const direction =
      input.direction ?? (input.reverseDirection !== false ? 'TARGET_TO_SOURCE' : 'SOURCE_TO_TARGET')

    return selected.map((vocab) => {
      const isReversed =
        direction === 'TARGET_TO_SOURCE'
          ? true
          : direction === 'SOURCE_TO_TARGET'
            ? false
            : Math.random() < 0.5
      return this.buildTrainingItem(vocab, pool, isReversed)
    })
  }

  /**
   * Selects cards for a study session ensuring that already-viewed/started cards
   * are consolidated ("sitzen") before new unseen cards are introduced.
   */
  public selectCardsForSession(
    pool: VocabularyDTO[],
    limit: number,
    focusMode: NonNullable<StartSessionInput['focusMode']> = 'CONSOLIDATE_FIRST',
    now: Date = new Date()
  ): VocabularyDTO[] {
    if (pool.length === 0) return []

    if (focusMode === 'ALL_SHUFFLE') {
      return [...pool].sort(() => Math.random() - 0.5).slice(0, limit)
    }

    const isStarted = (v: VocabularyDTO): boolean =>
      ((v.progress?.successCount ?? 0) + (v.progress?.failCount ?? 0)) > 0

    const isDue = (v: VocabularyDTO): boolean =>
      !v.progress || new Date(v.progress.nextReviewAt) <= now

    // A started card is considered "unconsolidated" (sitzt noch nicht fest) if:
    // - its masteryLevel < 2 (still New/Failed or Learning with < 2 successful repetitions), OR
    // - its current streak < 2, OR
    // - it is currently due for scheduled review (nextReviewAt <= now).
    const isUnconsolidated = (v: VocabularyDTO): boolean => {
      if (!isStarted(v)) return false
      const level = v.progress?.masteryLevel ?? 0
      const streak = v.progress?.streak ?? 0
      return level < 2 || streak < 2 || isDue(v)
    }

    const sortStartedPriority = (a: VocabularyDTO, b: VocabularyDTO): number => {
      const aDueScore = isDue(a) ? 0 : 1
      const bDueScore = isDue(b) ? 0 : 1
      if (aDueScore !== bDueScore) return aDueScore - bDueScore

      const aLevel = a.progress?.masteryLevel ?? 0
      const bLevel = b.progress?.masteryLevel ?? 0
      if (aLevel !== bLevel) return aLevel - bLevel

      const aStreak = a.progress?.streak ?? 0
      const bStreak = b.progress?.streak ?? 0
      if (aStreak !== bStreak) return aStreak - bStreak

      const aNext = a.progress?.nextReviewAt ? new Date(a.progress.nextReviewAt).getTime() : 0
      const bNext = b.progress?.nextReviewAt ? new Date(b.progress.nextReviewAt).getTime() : 0
      return aNext - bNext
    }

    const unconsolidatedStarted = pool
      .filter((v) => isUnconsolidated(v))
      .sort(sortStartedPriority)

    const consolidatedStarted = pool
      .filter((v) => isStarted(v) && !isUnconsolidated(v))
      .sort(sortStartedPriority)

    const unseenCards = pool
      .filter((v) => !isStarted(v))
      .sort((a, b) => (a.difficulty ?? 2) - (b.difficulty ?? 2) || Math.random() - 0.5)

    if (focusMode === 'ACTIVE_ONLY') {
      const activePool = [...unconsolidatedStarted, ...consolidatedStarted]
      if (activePool.length > 0) {
        return activePool.slice(0, limit)
      }
      // Fallback if the user hasn't started any card yet in this scope
      return unseenCards.slice(0, limit)
    }

    if (focusMode === 'NEW_ONLY') {
      return [...unseenCards, ...unconsolidatedStarted, ...consolidatedStarted].slice(0, limit)
    }

    // Default: CONSOLIDATE_FIRST
    // 1. All unconsolidated started cards come first so the user masters current cards before getting flooded
    // 2. Only fill remaining session capacity with unseen cards
    // 3. If still below limit, top up with already consolidated cards
    return [...unconsolidatedStarted, ...unseenCards, ...consolidatedStarted].slice(0, limit)
  }

  private buildTrainingItem(
    vocab: VocabularyDTO,
    pool: VocabularyDTO[],
    reverse: boolean
  ): TrainingItemDTO {
    const defaultLang = { id: 'default', code: 'en', locale: 'en-US', name: 'Sprache', flag: '🌐' }
    const srcLang = vocab.sourceLanguage ?? defaultLang
    const tgtLang = vocab.targetLanguage ?? defaultLang

    // reverse === true means: Prompt in Target Language (e.g. Deutsch), Answer in Source Language (e.g. Englisch/Spanisch)
    const promptText = reverse ? vocab.targetTexts.join(', ') : vocab.sourceText
    const expectedAnswers = reverse ? [vocab.sourceText] : vocab.targetTexts
    const promptLanguage = reverse ? tgtLang : srcLang
    const answerLanguage = reverse ? srcLang : tgtLang

    // Generate 4 multiple choice options (1 correct + up to 3 distractors)
    const correctOption = expectedAnswers[0] ?? ''
    const distractors = pool
      .filter((other) => other.id !== vocab.id)
      .map((other) => (reverse ? other.sourceText : (other.targetTexts[0] ?? '')))
      .filter((txt) => txt && txt.toLowerCase() !== correctOption.toLowerCase())

    const uniqueDistractors = Array.from(new Set(distractors))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    // Fallback generic distractors if vocabulary pool has fewer than 4 items
    const fallbackPool = reverse
      ? ['resilience', 'accomplish', 'ubiquitous', 'endeavor', 'ephemeral']
      : ['Widerstandsfähigkeit', 'erreichen', 'allgegenwärtig', 'Bemühung', 'flüchtig']
    while (uniqueDistractors.length < 3) {
      const candidate = fallbackPool.find(
        (f) =>
          f.toLowerCase() !== correctOption.toLowerCase() && !uniqueDistractors.includes(f)
      )
      if (candidate) uniqueDistractors.push(candidate)
      else break
    }

    const multipleChoiceOptions = [correctOption, ...uniqueDistractors].sort(
      () => Math.random() - 0.5
    )

    // Build Cloze Sentence if an example sentence is available, otherwise synthesize one
    let clozeSentence: TrainingItemDTO['clozeSentence']
    if (vocab.examples.length > 0) {
      const ex = vocab.examples[0]
      const targetWord = ex.clozeWord || vocab.sourceText
      const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'gi')
      const masked = regex.test(ex.sentence)
        ? ex.sentence.replace(regex, '_____')
        : `${ex.sentence} (_____)`

      clozeSentence = {
        maskedSentence: masked,
        missingWord: vocab.sourceText,
        translation: ex.translation ?? vocab.targetTexts.join(', ')
      }
    } else {
      clozeSentence = {
        maskedSentence: `Gesuchter Begriff für „${vocab.targetTexts.join(', ')}“: _____`,
        missingWord: vocab.sourceText,
        translation: vocab.targetTexts.join(', ')
      }
    }

    return {
      vocabulary: vocab,
      promptText,
      expectedAnswers,
      promptLanguage,
      answerLanguage,
      isReversed: reverse,
      multipleChoiceOptions,
      clozeSentence
    }
  }

  public async submitAnswer(input: SubmitAnswerInput): Promise<AnswerEvaluationDTO> {
    const vocab = await this.lexiconRepo.getVocabularyById(input.vocabularyId)
    if (!vocab) {
      throw new Error(`Vokabel ${input.vocabularyId} nicht gefunden.`)
    }

    const profile = await this.profileRepo.getProfile()
    const currentProgress = await this.studyRepo.getProgress(vocab.id)

    let isCorrect = false
    let isAlmostRight = false
    let matchedAnswer =
      input.expectedAnswers && input.expectedAnswers.length > 0
        ? input.expectedAnswers[0]
        : (vocab.targetTexts[0] ?? vocab.sourceText)
    let levenshteinDistance = 0
    let qualityScore = 0
    let diffSegments = undefined

    if (input.mode === 'FLASHCARD' || input.mode === 'MATCHING') {
      qualityScore = input.selfRatingQuality ?? 4
      isCorrect = qualityScore >= 3
    } else {
      const validExpectations =
        input.expectedAnswers && input.expectedAnswers.length > 0
          ? input.expectedAnswers
          : input.mode === 'LISTENING' || input.mode === 'CLOZE'
            ? [vocab.sourceText, ...vocab.targetTexts]
            : [...vocab.targetTexts, vocab.sourceText]

      const evalOutcome = this.evaluator.evaluate(input.givenAnswer ?? '', validExpectations, {
        typoToleranceEnabled:
          input.mode === 'MULTIPLE_CHOICE' ? false : profile.typoToleranceEnabled,
        maxTypoDistance: profile.maxTypoDistance,
        responseTimeMs: input.responseTimeMs
      })

      isCorrect = evalOutcome.isCorrect
      isAlmostRight = evalOutcome.isAlmostRight
      matchedAnswer = evalOutcome.matchedAnswer
      levenshteinDistance = evalOutcome.levenshteinDistance
      qualityScore = evalOutcome.qualityScore
      diffSegments = evalOutcome.diffSegments
    }

    const sm2Update = this.sm2.calculateNextState(currentProgress, qualityScore)
    const updatedProgress = await this.studyRepo.saveProgress(vocab.id, {
      easeFactor: sm2Update.easeFactor,
      intervalDays: sm2Update.intervalDays,
      repetitions: sm2Update.repetitions,
      nextReviewAt: sm2Update.nextReviewAt.toISOString(),
      lastReviewedAt: sm2Update.lastReviewedAt.toISOString(),
      successCount: sm2Update.successCount,
      failCount: sm2Update.failCount,
      streak: sm2Update.streak,
      masteryLevel: sm2Update.masteryLevel
    })

    const xpReward = this.gamification.calculateReviewReward({
      mode: input.mode,
      isCorrect,
      isAlmostRight,
      currentCombo: input.currentCombo,
      totalXp: profile.totalXp,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      lastActiveDate: profile.lastActiveDate
    })

    await this.studyRepo.recordReviewLog({
      vocabularyId: vocab.id,
      mode: input.mode,
      quality: qualityScore,
      wasCorrect: isCorrect,
      wasAlmostRight: isAlmostRight,
      givenAnswer: input.givenAnswer,
      responseTimeMs: input.responseTimeMs,
      earnedXp: xpReward.earnedXp
    })

    const updatedProfile = await this.profileRepo.updateProfile({
      totalXp: xpReward.newTotalXp,
      level: xpReward.newLevel,
      currentStreak: xpReward.currentStreak,
      longestStreak: xpReward.longestStreak,
      lastActiveDate: xpReward.lastActiveDate
    })

    return {
      vocabularyId: vocab.id,
      isCorrect,
      isAlmostRight,
      matchedAnswer,
      levenshteinDistance,
      qualityScore,
      earnedXp: xpReward.earnedXp,
      newCombo: xpReward.newCombo,
      diffSegments,
      updatedProgress,
      userProfile: updatedProfile
    }
  }
}
