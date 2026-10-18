import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { randomUUID } from 'crypto'
import { inject, injectable } from 'tsyringe'
import {
  DI_TOKENS,
  ILexiconRepository,
  IProfileRepository,
  IStudyRepository
} from '@main/domain/repositories'
import { PrismaService } from './PrismaService'
import { PrismaLexiconRepository } from './PrismaLexiconRepository'
import { PrismaStudyRepository } from './PrismaStudyRepository'
import { GamificationService } from '@main/domain/services/GamificationService'
import {
  CategoryDTO,
  DashboardStatsDTO,
  LanguageDTO,
  SaveVocabularyInput,
  StudyProgressDTO,
  TagDTO,
  TrainingMode,
  UserProfileDTO,
  VocabularyDTO,
  VocabularyFilterInput
} from '@shared/dto'

interface LocalStoreSchema {
  languages: LanguageDTO[]
  categories: CategoryDTO[]
  tags: TagDTO[]
  vocabularies: VocabularyDTO[]
  reviewLogs: Array<{
    id: string
    vocabularyId: string
    mode: TrainingMode
    quality: number
    wasCorrect: boolean
    wasAlmostRight: boolean
    givenAnswer?: string
    responseTimeMs: number
    earnedXp: number
    reviewedAt: string
  }>
  profile: UserProfileDTO
}

@injectable()
export class ResilientDatabaseRepository
  implements ILexiconRepository, IStudyRepository, IProfileRepository
{
  private readonly storePath: string
  private state: LocalStoreSchema

  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(PrismaLexiconRepository) private readonly pgLexicon: PrismaLexiconRepository,
    @inject(PrismaStudyRepository) private readonly pgStudy: PrismaStudyRepository,
    @inject(GamificationService) private readonly gamification: GamificationService
  ) {
    const dataDir = path.join(os.homedir(), '.vokabeltrainer')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    this.storePath = path.join(dataDir, 'local-store.json')
    this.state = this.loadState()
  }

  private loadState(): LocalStoreSchema {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf-8')
        return JSON.parse(raw)
      }
    } catch {
      // ignore and create fresh
    }
    return {
      languages: [],
      categories: [],
      tags: [],
      vocabularies: [],
      reviewLogs: [],
      profile: {
        id: 'default-user',
        totalXp: 0,
        level: 1,
        xpForCurrentLevel: 0,
        xpForNextLevel: 200,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        dailyGoalCards: 20,
        reviewedTodayCount: 0,
        typoToleranceEnabled: true,
        maxTypoDistance: 1,
        preferredTtsProvider: 'AUTO',
        deeplApiKey: process.env.DEEPL_API_KEY || null,
        googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || null
      }
    }
  }

  private saveState(): void {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.state, null, 2), 'utf-8')
    } catch (err) {
      console.error('Failed to write fallback store:', err)
    }
  }

  private async isPgOnline(): Promise<boolean> {
    const status = await this.prisma.checkConnection()
    return status.connected
  }

  // --- ILexiconRepository ---
  public async getLanguages(): Promise<LanguageDTO[]> {
    if (await this.isPgOnline()) return this.pgLexicon.getLanguages()
    return [...this.state.languages].sort((a, b) => a.name.localeCompare(b.name))
  }

  public async saveLanguage(
    data: Partial<LanguageDTO> & { code: string; name: string; locale: string; flag: string }
  ): Promise<LanguageDTO> {
    if (await this.isPgOnline()) return this.pgLexicon.saveLanguage(data)

    const code = data.code.toLowerCase().trim()
    const existing = this.state.languages.find((l) => l.id === data.id || l.code === code)
    if (existing) {
      existing.code = code
      existing.name = data.name.trim()
      existing.locale = data.locale.trim()
      existing.flag = data.flag
      this.saveState()
      return existing
    }
    const created: LanguageDTO = {
      id: randomUUID(),
      code,
      name: data.name.trim(),
      locale: data.locale.trim(),
      flag: data.flag
    }
    this.state.languages.push(created)
    this.saveState()
    return created
  }

  public async deleteLanguage(id: string): Promise<void> {
    if (await this.isPgOnline()) return this.pgLexicon.deleteLanguage(id)
    this.state.languages = this.state.languages.filter((l) => l.id !== id)
    this.saveState()
  }

  public async getCategories(): Promise<CategoryDTO[]> {
    if (await this.isPgOnline()) return this.pgLexicon.getCategories()
    const now = new Date()
    return this.state.categories.map((c) => {
      const vocabs = this.state.vocabularies.filter((v) => v.categoryId === c.id)
      let newCount = 0
      let learningCount = 0
      let familiarCount = 0
      let confidentCount = 0
      let masteredCount = 0
      let dueCount = 0
      let totalMasteryPoints = 0
      let totalSuccess = 0
      let totalFail = 0

      for (const v of vocabs) {
        const level = v.progress?.masteryLevel ?? 0
        const started = ((v.progress?.successCount ?? 0) + (v.progress?.failCount ?? 0)) > 0
        if (level === 0 && !started) newCount++
        else if (level <= 1) learningCount++
        else if (level === 2) familiarCount++
        else if (level === 3) confidentCount++
        else masteredCount++

        if (!v.progress || new Date(v.progress.nextReviewAt) <= now) {
          dueCount++
        }

        if (level === 0) totalMasteryPoints += started ? 10 : 0
        else if (level === 1) totalMasteryPoints += 25
        else if (level === 2) totalMasteryPoints += 50
        else if (level === 3) totalMasteryPoints += 75
        else totalMasteryPoints += 100

        totalSuccess += v.progress?.successCount ?? 0
        totalFail += v.progress?.failCount ?? 0
      }

      const totalVocab = vocabs.length
      const folderScorePercent = totalVocab > 0 ? Math.round(totalMasteryPoints / totalVocab) : 0
      const totalAttempts = totalSuccess + totalFail
      const accuracyPercent = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0

      return {
        ...c,
        vocabularyCount: totalVocab,
        newCount,
        learningCount,
        familiarCount,
        confidentCount,
        masteredCount,
        dueCount,
        folderScorePercent,
        accuracyPercent
      }
    })
  }

  public async saveCategory(data: Partial<CategoryDTO> & { name: string }): Promise<CategoryDTO> {
    if (await this.isPgOnline()) return this.pgLexicon.saveCategory(data)
    const name = data.name.trim()
    const existing = this.state.categories.find(
      (c) => c.id === data.id || c.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      existing.name = name
      existing.description = data.description ?? existing.description
      existing.color = data.color ?? existing.color
      existing.icon = data.icon ?? existing.icon
      this.saveState()
      return existing
    }
    const created: CategoryDTO = {
      id: randomUUID(),
      name,
      description: data.description ?? null,
      color: data.color ?? '#6366f1',
      icon: data.icon ?? 'Folder'
    }
    this.state.categories.push(created)
    this.saveState()
    return created
  }

  public async deleteCategory(id: string): Promise<void> {
    if (await this.isPgOnline()) return this.pgLexicon.deleteCategory(id)
    this.state.categories = this.state.categories.filter((c) => c.id !== id)
    for (const v of this.state.vocabularies) {
      if (v.categoryId === id) {
        v.categoryId = null
      }
    }
    this.saveState()
  }

  public async getTags(): Promise<TagDTO[]> {
    if (await this.isPgOnline()) return this.pgLexicon.getTags()
    return this.state.tags.map((t) => ({
      ...t,
      vocabularyCount: this.state.vocabularies.filter((v) =>
        v.tags.some((vt) => vt.id === t.id)
      ).length
    }))
  }

  public async saveTag(data: Partial<TagDTO> & { name: string }): Promise<TagDTO> {
    if (await this.isPgOnline()) return this.pgLexicon.saveTag(data)
    const name = data.name.trim()
    const existing = this.state.tags.find(
      (t) => t.id === data.id || t.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      existing.name = name
      existing.color = data.color ?? existing.color
      this.saveState()
      return existing
    }
    const created: TagDTO = {
      id: randomUUID(),
      name,
      color: data.color ?? '#10b981'
    }
    this.state.tags.push(created)
    this.saveState()
    return created
  }

  public async deleteTag(id: string): Promise<void> {
    if (await this.isPgOnline()) return this.pgLexicon.deleteTag(id)
    this.state.tags = this.state.tags.filter((t) => t.id !== id)
    this.saveState()
  }

  public async getVocabularies(filter?: VocabularyFilterInput): Promise<VocabularyDTO[]> {
    if (await this.isPgOnline()) return this.pgLexicon.getVocabularies(filter)

    const now = new Date()
    let list = this.state.vocabularies.map((v) => this.hydrateVocab(v))

    if (filter?.sourceLanguageId) {
      list = list.filter((v) => v.sourceLanguageId === filter.sourceLanguageId)
    }
    if (filter?.targetLanguageId) {
      list = list.filter((v) => v.targetLanguageId === filter.targetLanguageId)
    }
    if (filter?.categoryId) {
      list = list.filter((v) => v.categoryId === filter.categoryId)
    }
    if (filter?.tagId) {
      list = list.filter((v) => v.tags.some((t) => t.id === filter.tagId))
    }
    if (filter?.dueOnly) {
      list = list.filter((v) => !v.progress || new Date(v.progress.nextReviewAt) <= now)
    }
    if (filter?.search && filter.search.trim().length > 0) {
      const q = filter.search.trim().toLowerCase()
      list = list.filter(
        (v) =>
          v.sourceText.toLowerCase().includes(q) ||
          v.targetTexts.some((t) => t.toLowerCase().includes(q)) ||
          (v.notes && v.notes.toLowerCase().includes(q)) ||
          v.tags.some((t) => t.name.toLowerCase().includes(q))
      )
    }

    return list
  }

  public async getVocabularyById(id: string): Promise<VocabularyDTO | null> {
    if (await this.isPgOnline()) return this.pgLexicon.getVocabularyById(id)
    const found = this.state.vocabularies.find((v) => v.id === id)
    return found ? this.hydrateVocab(found) : null
  }

  public async saveVocabulary(input: SaveVocabularyInput): Promise<VocabularyDTO> {
    if (await this.isPgOnline()) return this.pgLexicon.saveVocabulary(input)

    const resolvedTags: TagDTO[] = []
    if (input.tagNames) {
      for (const name of input.tagNames) {
        if (!name.trim()) continue
        const tag = await this.saveTag({ name })
        resolvedTags.push(tag)
      }
    }

    const nowIso = new Date().toISOString()
    const existingIdx = input.id
      ? this.state.vocabularies.findIndex((v) => v.id === input.id)
      : -1

    const baseProgress: StudyProgressDTO =
      existingIdx >= 0 && this.state.vocabularies[existingIdx].progress
        ? this.state.vocabularies[existingIdx].progress!
        : {
            easeFactor: 2.5,
            intervalDays: 0,
            repetitions: 0,
            nextReviewAt: nowIso,
            lastReviewedAt: null,
            successCount: 0,
            failCount: 0,
            streak: 0,
            masteryLevel: 0
          }

    const record: VocabularyDTO = {
      id: existingIdx >= 0 ? this.state.vocabularies[existingIdx].id : randomUUID(),
      sourceText: input.sourceText.trim(),
      targetTexts: input.targetTexts.map((t) => t.trim()).filter(Boolean),
      partOfSpeech: input.partOfSpeech?.trim() || null,
      phonetic: input.phonetic?.trim() || null,
      audioUrl: input.audioUrl?.trim() || null,
      notes: input.notes?.trim() || null,
      difficulty: input.difficulty ?? 1,
      sourceLanguageId: input.sourceLanguageId,
      targetLanguageId: input.targetLanguageId,
      categoryId: input.categoryId || null,
      tags: resolvedTags,
      examples: (input.examples ?? []).map((ex) => ({
        id: ex.id ?? randomUUID(),
        sentence: ex.sentence,
        translation: ex.translation ?? null,
        clozeWord: ex.clozeWord ?? input.sourceText.trim()
      })),
      progress: baseProgress,
      createdAt: existingIdx >= 0 ? this.state.vocabularies[existingIdx].createdAt : nowIso,
      updatedAt: nowIso
    }

    if (existingIdx >= 0) {
      this.state.vocabularies[existingIdx] = record
    } else {
      this.state.vocabularies.unshift(record)
    }
    this.saveState()
    return this.hydrateVocab(record)
  }

  public async bulkSaveVocabularies(inputs: SaveVocabularyInput[]): Promise<number> {
    if (await this.isPgOnline()) {
      return this.pgLexicon.bulkSaveVocabularies(inputs)
    }

    const existingKeys = new Set(
      this.state.vocabularies.map(
        (v) => `${v.sourceText.toLowerCase()}::${v.partOfSpeech ?? ''}`
      )
    )

    const tagMap = new Map<string, TagDTO>()
    for (const t of this.state.tags) {
      tagMap.set(t.name.toLowerCase(), t)
    }

    const nowIso = new Date().toISOString()
    let addedCount = 0

    for (const input of inputs) {
      const cleanSource = input.sourceText.trim()
      const key = `${cleanSource.toLowerCase()}::${input.partOfSpeech ?? ''}`
      if (existingKeys.has(key)) continue
      existingKeys.add(key)

      const resolvedTags: TagDTO[] = []
      if (input.tagNames) {
        for (const rawName of input.tagNames) {
          const name = rawName.trim()
          if (!name) continue
          let tag = tagMap.get(name.toLowerCase())
          if (!tag) {
            tag = { id: randomUUID(), name, color: '#d97706' }
            this.state.tags.push(tag)
            tagMap.set(name.toLowerCase(), tag)
          }
          resolvedTags.push(tag)
        }
      }

      const record: VocabularyDTO = {
        id: randomUUID(),
        sourceText: cleanSource,
        targetTexts: input.targetTexts.map((t) => t.trim()).filter(Boolean),
        partOfSpeech: input.partOfSpeech?.trim() || null,
        phonetic: input.phonetic?.trim() || null,
        audioUrl: input.audioUrl?.trim() || null,
        notes: input.notes?.trim() || null,
        difficulty: input.difficulty ?? 2,
        sourceLanguageId: input.sourceLanguageId,
        targetLanguageId: input.targetLanguageId,
        categoryId: input.categoryId || null,
        tags: resolvedTags,
        examples: (input.examples ?? []).map((ex) => ({
          id: randomUUID(),
          sentence: ex.sentence,
          translation: ex.translation ?? null,
          clozeWord: ex.clozeWord ?? cleanSource
        })),
        progress: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          nextReviewAt: nowIso,
          lastReviewedAt: null,
          successCount: 0,
          failCount: 0,
          streak: 0,
          masteryLevel: 0
        },
        createdAt: nowIso,
        updatedAt: nowIso
      }

      this.state.vocabularies.push(record)
      addedCount++
    }

    if (addedCount > 0) {
      this.saveState()
    }
    return addedCount
  }

  public async deleteVocabulary(id: string): Promise<void> {
    if (await this.isPgOnline()) return this.pgLexicon.deleteVocabulary(id)
    this.state.vocabularies = this.state.vocabularies.filter((v) => v.id !== id)
    this.saveState()
  }

  public async assignVocabulariesToCategory(
    vocabularyIds: string[],
    categoryId: string | null
  ): Promise<number> {
    if (await this.isPgOnline()) {
      return this.pgLexicon.assignVocabulariesToCategory(vocabularyIds, categoryId)
    }
    const idSet = new Set(vocabularyIds)
    let updated = 0
    for (const v of this.state.vocabularies) {
      if (idSet.has(v.id)) {
        v.categoryId = categoryId
        v.updatedAt = new Date().toISOString()
        updated++
      }
    }
    if (updated > 0) {
      this.saveState()
    }
    return updated
  }

  public async populateCategoryBatch(input: {
    targetCategoryId: string
    count: number
    tagId?: string
    onlyUnstarted?: boolean
  }): Promise<number> {
    if (await this.isPgOnline()) {
      return this.pgLexicon.populateCategoryBatch(input)
    }
    const candidates = this.state.vocabularies.filter((v) => {
      if (v.categoryId === input.targetCategoryId) return false
      if (input.tagId && !v.tags.some((t) => t.id === input.tagId)) return false
      if (input.onlyUnstarted) {
        const started = ((v.progress?.successCount ?? 0) + (v.progress?.failCount ?? 0)) > 0
        return !started && (v.progress?.masteryLevel ?? 0) === 0
      }
      return (v.progress?.masteryLevel ?? 0) < 3
    })

    const selected = candidates
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(1, input.count))
      .map((v) => v.id)

    return this.assignVocabulariesToCategory(selected, input.targetCategoryId)
  }

  // --- IStudyRepository & IProfileRepository ---
  public async getProfile(): Promise<UserProfileDTO> {
    if (await this.isPgOnline()) return this.pgStudy.getProfile()

    const todayStr = this.gamification.toDateString(new Date())
    const reviewedTodayCount = this.state.reviewLogs.filter((l) =>
      l.reviewedAt.startsWith(todayStr)
    ).length
    const levelInfo = this.gamification.computeLevel(this.state.profile.totalXp)

    return {
      ...this.state.profile,
      level: levelInfo.level,
      xpForCurrentLevel: levelInfo.xpForCurrentLevel,
      xpForNextLevel: levelInfo.xpForNextLevel,
      reviewedTodayCount
    }
  }

  public async updateProfile(data: Partial<UserProfileDTO>): Promise<UserProfileDTO> {
    if (await this.isPgOnline()) return this.pgStudy.updateProfile(data)
    this.state.profile = {
      ...this.state.profile,
      ...data
    }
    this.saveState()
    return this.getProfile()
  }

  public async getProgress(vocabularyId: string): Promise<StudyProgressDTO | null> {
    if (await this.isPgOnline()) return this.pgStudy.getProgress(vocabularyId)
    const v = this.state.vocabularies.find((it) => it.id === vocabularyId)
    return v?.progress ?? null
  }

  public async saveProgress(
    vocabularyId: string,
    progress: StudyProgressDTO
  ): Promise<StudyProgressDTO> {
    if (await this.isPgOnline()) return this.pgStudy.saveProgress(vocabularyId, progress)
    const v = this.state.vocabularies.find((it) => it.id === vocabularyId)
    if (v) {
      v.progress = progress
      this.saveState()
    }
    return progress
  }

  public async resetProgress(vocabularyId: string): Promise<void> {
    if (await this.isPgOnline()) return this.pgStudy.resetProgress(vocabularyId)
    const v = this.state.vocabularies.find((it) => it.id === vocabularyId)
    if (v) {
      v.progress = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: new Date().toISOString(),
        lastReviewedAt: null,
        successCount: 0,
        failCount: 0,
        streak: 0,
        masteryLevel: 0
      }
      this.saveState()
    }
  }

  public async recordReviewLog(entry: {
    vocabularyId: string
    mode: TrainingMode
    quality: number
    wasCorrect: boolean
    wasAlmostRight: boolean
    givenAnswer?: string
    responseTimeMs: number
    earnedXp: number
  }): Promise<void> {
    if (await this.isPgOnline()) return this.pgStudy.recordReviewLog(entry)
    this.state.reviewLogs.unshift({
      id: randomUUID(),
      ...entry,
      reviewedAt: new Date().toISOString()
    })
    this.saveState()
  }

  public async getDashboardStats(profile: UserProfileDTO): Promise<DashboardStatsDTO> {
    if (await this.isPgOnline()) return this.pgStudy.getDashboardStats(profile)

    const now = new Date()
    const allVocabs = this.state.vocabularies.map((v) => this.hydrateVocab(v))
    let dueNowCount = 0
    const masteryDistribution = {
      newCount: 0,
      learningCount: 0,
      familiarCount: 0,
      confidentCount: 0,
      masteredCount: 0
    }
    const langMap = new Map<string, { language: LanguageDTO; count: number; dueCount: number }>()

    for (const v of allVocabs) {
      const isDue = !v.progress || new Date(v.progress.nextReviewAt) <= now
      if (isDue) dueNowCount++

      const level = v.progress?.masteryLevel ?? 0
      if (level === 0) masteryDistribution.newCount++
      else if (level === 1) masteryDistribution.learningCount++
      else if (level === 2) masteryDistribution.familiarCount++
      else if (level === 3) masteryDistribution.confidentCount++
      else masteryDistribution.masteredCount++

      if (v.sourceLanguage) {
        const entry = langMap.get(v.sourceLanguageId) ?? {
          language: v.sourceLanguage,
          count: 0,
          dueCount: 0
        }
        entry.count++
        if (isDue) entry.dueCount++
        langMap.set(v.sourceLanguageId, entry)
      }
    }

    const totalReviews = this.state.reviewLogs.length
    const totalCorrect = this.state.reviewLogs.filter((l) => l.wasCorrect).length
    const overallAccuracy =
      totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 100

    return {
      totalVocabularies: allVocabs.length,
      dueNowCount,
      masteryDistribution,
      overallAccuracy,
      totalReviews,
      recentActivity: [],
      languageCounts: Array.from(langMap.values()),
      profile
    }
  }

  private hydrateVocab(v: VocabularyDTO): VocabularyDTO {
    return {
      ...v,
      sourceLanguage: this.state.languages.find((l) => l.id === v.sourceLanguageId),
      targetLanguage: this.state.languages.find((l) => l.id === v.targetLanguageId),
      category: this.state.categories.find((c) => c.id === v.categoryId) ?? null
    }
  }
}
