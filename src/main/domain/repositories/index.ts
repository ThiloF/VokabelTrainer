import {
  CategoryDTO,
  DashboardStatsDTO,
  EnrichmentRequestDTO,
  EnrichmentResultDTO,
  ExchangeFormat,
  LanguageDTO,
  SaveVocabularyInput,
  StudyProgressDTO,
  TagDTO,
  TrainingMode,
  UserProfileDTO,
  VocabularyDTO,
  VocabularyFilterInput
} from '@shared/dto'

export const DI_TOKENS = {
  LexiconRepository: Symbol.for('ILexiconRepository'),
  StudyRepository: Symbol.for('IStudyRepository'),
  ProfileRepository: Symbol.for('IProfileRepository'),
  DictionaryProvider: Symbol.for('IDictionaryProvider'),
  TranslationProvider: Symbol.for('ITranslationProvider'),
  AudioProvider: Symbol.for('IAudioProvider')
} as const

export interface ILexiconRepository {
  getLanguages(): Promise<LanguageDTO[]>
  saveLanguage(data: Partial<LanguageDTO> & { code: string; name: string; locale: string; flag: string }): Promise<LanguageDTO>
  deleteLanguage(id: string): Promise<void>

  getCategories(): Promise<CategoryDTO[]>
  saveCategory(data: Partial<CategoryDTO> & { name: string }): Promise<CategoryDTO>
  deleteCategory(id: string): Promise<void>

  getTags(): Promise<TagDTO[]>
  saveTag(data: Partial<TagDTO> & { name: string }): Promise<TagDTO>
  deleteTag(id: string): Promise<void>

  getVocabularies(filter?: VocabularyFilterInput): Promise<VocabularyDTO[]>
  getVocabularyById(id: string): Promise<VocabularyDTO | null>
  saveVocabulary(input: SaveVocabularyInput): Promise<VocabularyDTO>
  bulkSaveVocabularies(inputs: SaveVocabularyInput[]): Promise<number>
  deleteVocabulary(id: string): Promise<void>
}

export interface IStudyRepository {
  getProgress(vocabularyId: string): Promise<StudyProgressDTO | null>
  saveProgress(vocabularyId: string, progress: StudyProgressDTO): Promise<StudyProgressDTO>
  resetProgress(vocabularyId: string): Promise<void>
  recordReviewLog(entry: {
    vocabularyId: string
    mode: TrainingMode
    quality: number
    wasCorrect: boolean
    wasAlmostRight: boolean
    givenAnswer?: string
    responseTimeMs: number
    earnedXp: number
  }): Promise<void>
  getDashboardStats(profile: UserProfileDTO): Promise<DashboardStatsDTO>
}

export interface IProfileRepository {
  getProfile(): Promise<UserProfileDTO>
  updateProfile(data: Partial<UserProfileDTO>): Promise<UserProfileDTO>
}

export interface IDictionaryProvider {
  lookupWord(word: string, langCode: string): Promise<Partial<EnrichmentResultDTO> | null>
}

export interface ITranslationProvider {
  translate(
    req: EnrichmentRequestDTO,
    credentials?: { deeplApiKey?: string | null; googleTranslateApiKey?: string | null }
  ): Promise<{ translations: string[]; providerUsed: string }>
}

export interface IAudioProvider {
  fetchPronunciationUrl(text: string, langCode: string): Promise<string | null>
}

export interface IExchangeStrategy {
  readonly format: ExchangeFormat
  serialize(vocabularies: VocabularyDTO[], includeProgress?: boolean): string
  parse(
    content: string,
    defaults: {
      sourceLanguageId: string
      targetLanguageId: string
      categoryId?: string | null
    }
  ): SaveVocabularyInput[]
}
