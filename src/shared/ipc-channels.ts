import {
  AnswerEvaluationDTO,
  CategoryDTO,
  DashboardStatsDTO,
  EnrichmentRequestDTO,
  EnrichmentResultDTO,
  ExportRequestDTO,
  ImportRequestDTO,
  ImportResultDTO,
  LanguageDTO,
  SaveVocabularyInput,
  StartSessionInput,
  SubmitAnswerInput,
  TagDTO,
  TrainingItemDTO,
  UserProfileDTO,
  VocabularyDTO,
  VocabularyFilterInput
} from './dto'

export const IPC_CHANNELS = {
  // Dashboard & Profile
  GET_DASHBOARD_STATS: 'dashboard:get-stats',
  GET_PROFILE: 'profile:get',
  UPDATE_PROFILE: 'profile:update',
  CHECK_DB_CONNECTION: 'system:check-db',

  // Languages, Categories & Tags
  GET_LANGUAGES: 'lexicon:get-languages',
  SAVE_LANGUAGE: 'lexicon:save-language',
  DELETE_LANGUAGE: 'lexicon:delete-language',

  GET_CATEGORIES: 'lexicon:get-categories',
  SAVE_CATEGORY: 'lexicon:save-category',
  DELETE_CATEGORY: 'lexicon:delete-category',

  GET_TAGS: 'lexicon:get-tags',
  SAVE_TAG: 'lexicon:save-tag',
  DELETE_TAG: 'lexicon:delete-tag',

  // Vocabularies
  GET_VOCABULARIES: 'lexicon:get-vocabularies',
  SAVE_VOCABULARY: 'lexicon:save-vocabulary',
  DELETE_VOCABULARY: 'lexicon:delete-vocabulary',
  RESET_VOCABULARY_PROGRESS: 'lexicon:reset-progress',

  // Enrichment & Audio
  ENRICH_VOCABULARY: 'enrichment:enrich',
  FETCH_TTS_AUDIO: 'enrichment:fetch-tts',

  // Learning & Training
  START_TRAINING_SESSION: 'learning:start-session',
  SUBMIT_TRAINING_ANSWER: 'learning:submit-answer',

  // Import & Export
  EXPORT_VOCABULARIES: 'exchange:export',
  IMPORT_VOCABULARIES: 'exchange:import',
  PREVIEW_IMPORT: 'exchange:preview-import'
} as const

export interface ElectronAPI {
  getDashboardStats: () => Promise<DashboardStatsDTO>
  getProfile: () => Promise<UserProfileDTO>
  updateProfile: (data: Partial<UserProfileDTO>) => Promise<UserProfileDTO>
  checkDbConnection: () => Promise<{ connected: boolean; error?: string }>

  getLanguages: () => Promise<LanguageDTO[]>
  saveLanguage: (lang: Partial<LanguageDTO> & { code: string; name: string; locale: string; flag: string }) => Promise<LanguageDTO>
  deleteLanguage: (id: string) => Promise<void>

  getCategories: () => Promise<CategoryDTO[]>
  saveCategory: (cat: Partial<CategoryDTO> & { name: string }) => Promise<CategoryDTO>
  deleteCategory: (id: string) => Promise<void>

  getTags: () => Promise<TagDTO[]>
  saveTag: (tag: Partial<TagDTO> & { name: string }) => Promise<TagDTO>
  deleteTag: (id: string) => Promise<void>

  getVocabularies: (filter?: VocabularyFilterInput) => Promise<VocabularyDTO[]>
  saveVocabulary: (input: SaveVocabularyInput) => Promise<VocabularyDTO>
  deleteVocabulary: (id: string) => Promise<void>
  resetVocabularyProgress: (id: string) => Promise<void>

  enrichVocabulary: (req: EnrichmentRequestDTO) => Promise<EnrichmentResultDTO>
  fetchTtsAudio: (text: string, langCode: string) => Promise<string | null>

  startTrainingSession: (input: StartSessionInput) => Promise<TrainingItemDTO[]>
  submitTrainingAnswer: (input: SubmitAnswerInput) => Promise<AnswerEvaluationDTO>

  exportVocabularies: (req: ExportRequestDTO) => Promise<string>
  importVocabularies: (req: ImportRequestDTO) => Promise<ImportResultDTO>
  previewImport: (req: ImportRequestDTO) => Promise<SaveVocabularyInput[]>
}
