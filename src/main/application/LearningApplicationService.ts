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
    const allMatching = await this.lexiconRepo.getVocabularies({
      sourceLanguageId: input.sourceLanguageId,
      targetLanguageId: input.targetLanguageId,
      categoryId: input.categoryId,
      tagId: input.tagId,
      dueOnly: input.dueOnly
    })

    // If dueOnly was requested but none are due, fall back to all matching so user can still practice
    const pool =
      allMatching.length > 0
        ? allMatching
        : await this.lexiconRepo.getVocabularies({
            sourceLanguageId: input.sourceLanguageId,
            targetLanguageId: input.targetLanguageId,
            categoryId: input.categoryId,
            tagId: input.tagId
          })

    // Sort: Due cards first, then lower mastery level, then slight randomization
    const now = new Date()
    const sorted = [...pool].sort((a, b) => {
      const aDue = !a.progress || new Date(a.progress.nextReviewAt) <= now ? 0 : 1
      const bDue = !b.progress || new Date(b.progress.nextReviewAt) <= now ? 0 : 1
      if (aDue !== bDue) return aDue - bDue
      const aLevel = a.progress?.masteryLevel ?? 0
      const bLevel = b.progress?.masteryLevel ?? 0
      if (aLevel !== bLevel) return aLevel - bLevel
      return Math.random() - 0.5
    })

    const limit = input.limit ?? 20
    const selected = sorted.slice(0, limit)

    return selected.map((vocab) =>
      this.buildTrainingItem(vocab, pool, Boolean(input.reverseDirection))
    )
  }

  private buildTrainingItem(
    vocab: VocabularyDTO,
    pool: VocabularyDTO[],
    reverse: boolean
  ): TrainingItemDTO {
    const defaultLang = { id: 'default', code: 'en', locale: 'en-US', name: 'Sprache', flag: '🌐' }
    const srcLang = vocab.sourceLanguage ?? defaultLang
    const tgtLang = vocab.targetLanguage ?? defaultLang

    const promptText = reverse ? (vocab.targetTexts[0] ?? vocab.sourceText) : vocab.sourceText
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
    const fallbackPool = ['Haus', 'laufen', 'schnell', 'Gedanke', 'Freiheit', 'to run', 'freedom']
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
    let matchedAnswer = vocab.targetTexts[0] ?? vocab.sourceText
    let levenshteinDistance = 0
    let qualityScore = 0
    let diffSegments = undefined

    if (input.mode === 'FLASHCARD' || input.mode === 'MATCHING') {
      qualityScore = input.selfRatingQuality ?? 4
      isCorrect = qualityScore >= 3
    } else {
      // For LISTENING and CLOZE, the user types the sourceText; for TYPING/MULTIPLE_CHOICE, the targetTexts (or either)
      const validExpectations =
        input.mode === 'LISTENING' || input.mode === 'CLOZE'
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
