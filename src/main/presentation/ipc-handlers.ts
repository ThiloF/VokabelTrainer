import { ipcMain } from 'electron'
import { DependencyContainer } from 'tsyringe'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import {
  DI_TOKENS,
  ILexiconRepository,
  IProfileRepository,
  IStudyRepository
} from '@main/domain/repositories'
import { PrismaService } from '@main/infrastructure/database/PrismaService'
import { EnrichmentApplicationService } from '@main/application/EnrichmentApplicationService'
import { LearningApplicationService } from '@main/application/LearningApplicationService'
import { DataExchangeApplicationService } from '@main/application/DataExchangeApplicationService'
import { DatabaseSeeder } from '@main/infrastructure/database/DatabaseSeeder'

export function registerIpcHandlers(container: DependencyContainer): void {
  const prismaService = container.resolve(PrismaService)
  const lexiconRepo = container.resolve<ILexiconRepository>(DI_TOKENS.LexiconRepository)
  const studyRepo = container.resolve<IStudyRepository>(DI_TOKENS.StudyRepository)
  const profileRepo = container.resolve<IProfileRepository>(DI_TOKENS.ProfileRepository)
  const enrichmentService = container.resolve(EnrichmentApplicationService)
  const learningService = container.resolve(LearningApplicationService)
  const exchangeService = container.resolve(DataExchangeApplicationService)
  const seeder = container.resolve(DatabaseSeeder)

  // System & DB Check
  ipcMain.handle(IPC_CHANNELS.CHECK_DB_CONNECTION, async () => {
    const status = await prismaService.checkConnection()
    await seeder.seedIfEmpty()
    return status
  })

  // Dashboard & Profile
  ipcMain.handle(IPC_CHANNELS.GET_PROFILE, async () => {
    return profileRepo.getProfile()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROFILE, async (_event, data) => {
    return profileRepo.updateProfile(data)
  })

  ipcMain.handle(IPC_CHANNELS.GET_DASHBOARD_STATS, async () => {
    await seeder.seedIfEmpty()
    const profile = await profileRepo.getProfile()
    return studyRepo.getDashboardStats(profile)
  })

  // Languages
  ipcMain.handle(IPC_CHANNELS.GET_LANGUAGES, async () => {
    return lexiconRepo.getLanguages()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_LANGUAGE, async (_event, lang) => {
    return lexiconRepo.saveLanguage(lang)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_LANGUAGE, async (_event, id: string) => {
    return lexiconRepo.deleteLanguage(id)
  })

  // Categories
  ipcMain.handle(IPC_CHANNELS.GET_CATEGORIES, async () => {
    return lexiconRepo.getCategories()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_CATEGORY, async (_event, cat) => {
    return lexiconRepo.saveCategory(cat)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_CATEGORY, async (_event, id: string) => {
    return lexiconRepo.deleteCategory(id)
  })

  // Tags
  ipcMain.handle(IPC_CHANNELS.GET_TAGS, async () => {
    return lexiconRepo.getTags()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_TAG, async (_event, tag) => {
    return lexiconRepo.saveTag(tag)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_TAG, async (_event, id: string) => {
    return lexiconRepo.deleteTag(id)
  })

  // Vocabularies
  ipcMain.handle(IPC_CHANNELS.GET_VOCABULARIES, async (_event, filter) => {
    return lexiconRepo.getVocabularies(filter)
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_VOCABULARY, async (_event, input) => {
    return lexiconRepo.saveVocabulary(input)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_VOCABULARY, async (_event, id: string) => {
    return lexiconRepo.deleteVocabulary(id)
  })

  ipcMain.handle(IPC_CHANNELS.RESET_VOCABULARY_PROGRESS, async (_event, id: string) => {
    return studyRepo.resetProgress(id)
  })

  // Enrichment & TTS Audio
  ipcMain.handle(IPC_CHANNELS.ENRICH_VOCABULARY, async (_event, req) => {
    return enrichmentService.enrichVocabulary(req)
  })

  ipcMain.handle(IPC_CHANNELS.FETCH_TTS_AUDIO, async (_event, text: string, langCode: string) => {
    return enrichmentService.fetchTtsAudio(text, langCode)
  })

  // Learning & Training
  ipcMain.handle(IPC_CHANNELS.START_TRAINING_SESSION, async (_event, input) => {
    return learningService.startSession(input)
  })

  ipcMain.handle(IPC_CHANNELS.SUBMIT_TRAINING_ANSWER, async (_event, input) => {
    return learningService.submitAnswer(input)
  })

  // Import & Export
  ipcMain.handle(IPC_CHANNELS.EXPORT_VOCABULARIES, async (_event, req) => {
    return exchangeService.exportVocabularies(req)
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_VOCABULARIES, async (_event, req) => {
    return exchangeService.importVocabularies(req)
  })

  ipcMain.handle(IPC_CHANNELS.PREVIEW_IMPORT, async (_event, req) => {
    return exchangeService.previewImport(req)
  })
}
