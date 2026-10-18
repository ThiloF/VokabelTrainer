export type TrainingMode =
  | 'FLASHCARD'
  | 'TYPING'
  | 'MULTIPLE_CHOICE'
  | 'LISTENING'
  | 'CLOZE'
  | 'MATCHING'

export type ExchangeFormat = 'JSON' | 'XML' | 'CSV'

export interface LanguageDTO {
  id: string
  code: string
  locale: string
  name: string
  flag: string
}

export interface CategoryDTO {
  id: string
  name: string
  description?: string | null
  color: string
  icon: string
  vocabularyCount?: number
}

export interface TagDTO {
  id: string
  name: string
  color: string
  vocabularyCount?: number
}

export interface ExampleSentenceDTO {
  id?: string
  sentence: string
  translation?: string | null
  clozeWord?: string | null
}

export interface StudyProgressDTO {
  easeFactor: number
  intervalDays: number
  repetitions: number
  nextReviewAt: string
  lastReviewedAt?: string | null
  successCount: number
  failCount: number
  streak: number
  masteryLevel: number // 0..4
}

export interface VocabularyDTO {
  id: string
  sourceText: string
  targetTexts: string[]
  partOfSpeech?: string | null
  phonetic?: string | null
  audioUrl?: string | null
  notes?: string | null
  difficulty: number
  sourceLanguageId: string
  sourceLanguage?: LanguageDTO
  targetLanguageId: string
  targetLanguage?: LanguageDTO
  categoryId?: string | null
  category?: CategoryDTO | null
  tags: TagDTO[]
  examples: ExampleSentenceDTO[]
  progress?: StudyProgressDTO | null
  createdAt: string
  updatedAt: string
}

export interface SaveVocabularyInput {
  id?: string
  sourceText: string
  targetTexts: string[]
  partOfSpeech?: string
  phonetic?: string
  audioUrl?: string
  notes?: string
  difficulty?: number
  sourceLanguageId: string
  targetLanguageId: string
  categoryId?: string | null
  tagIds?: string[]
  tagNames?: string[]
  examples?: ExampleSentenceDTO[]
}

export interface VocabularyFilterInput {
  search?: string
  sourceLanguageId?: string
  targetLanguageId?: string
  categoryId?: string
  tagId?: string
  masteryLevel?: number
  dueOnly?: boolean
}

export type QueryDirection = 'TARGET_TO_SOURCE' | 'SOURCE_TO_TARGET' | 'MIXED'

export interface StartSessionInput {
  mode: TrainingMode
  sourceLanguageId?: string
  targetLanguageId?: string
  categoryId?: string
  tagId?: string
  dueOnly?: boolean
  limit?: number
  reverseDirection?: boolean
  direction?: QueryDirection
}

export interface TrainingItemDTO {
  vocabulary: VocabularyDTO
  promptText: string
  expectedAnswers: string[]
  promptLanguage: LanguageDTO
  answerLanguage: LanguageDTO
  isReversed: boolean
  multipleChoiceOptions: string[]
  clozeSentence?: {
    maskedSentence: string
    missingWord: string
    translation?: string | null
  }
}

export interface SubmitAnswerInput {
  vocabularyId: string
  mode: TrainingMode
  givenAnswer?: string
  expectedAnswers?: string[]
  selfRatingQuality?: number // 0..5 for Flashcard mode
  responseTimeMs: number
  currentCombo: number
}

export interface CharDiffSegment {
  text: string
  status: 'correct' | 'typo' | 'missing'
}

export interface AnswerEvaluationDTO {
  vocabularyId: string
  isCorrect: boolean
  isAlmostRight: boolean
  matchedAnswer: string
  levenshteinDistance: number
  qualityScore: number // 0..5
  earnedXp: number
  newCombo: number
  diffSegments?: CharDiffSegment[]
  updatedProgress: StudyProgressDTO
  userProfile: UserProfileDTO
}

export interface EnrichmentRequestDTO {
  word: string
  sourceLangCode: string
  targetLangCode: string
}

export interface EnrichmentResultDTO {
  word: string
  translations: string[]
  phonetic?: string
  partOfSpeech?: string
  audioUrl?: string
  definitions: string[]
  examples: ExampleSentenceDTO[]
  providerUsed: string
}

export interface ExportRequestDTO {
  format: ExchangeFormat
  filter?: VocabularyFilterInput
  includeProgress?: boolean
}

export interface ImportRequestDTO {
  format: ExchangeFormat
  content: string
  defaultSourceLanguageId: string
  defaultTargetLanguageId: string
  defaultCategoryId?: string | null
}

export interface ImportResultDTO {
  importedCount: number
  skippedCount: number
  errors: string[]
}

export interface UserProfileDTO {
  id: string
  totalXp: number
  level: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  currentStreak: number
  longestStreak: number
  lastActiveDate?: string | null
  dailyGoalCards: number
  reviewedTodayCount: number
  typoToleranceEnabled: boolean
  maxTypoDistance: number
  preferredTtsProvider: string
  deeplApiKey?: string | null
  googleTranslateApiKey?: string | null
}

export interface DashboardStatsDTO {
  totalVocabularies: number
  dueNowCount: number
  masteryDistribution: {
    newCount: number
    learningCount: number
    familiarCount: number
    confidentCount: number
    masteredCount: number
  }
  overallAccuracy: number
  totalReviews: number
  recentActivity: Array<{
    date: string
    reviewsCount: number
    correctCount: number
    earnedXp: number
  }>
  languageCounts: Array<{
    language: LanguageDTO
    count: number
    dueCount: number
  }>
  profile: UserProfileDTO
}
