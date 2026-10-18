import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI, IPC_CHANNELS } from '@shared/ipc-channels'

const api: ElectronAPI = {
  getDashboardStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DASHBOARD_STATS),
  getProfile: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILE),
  updateProfile: (data) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROFILE, data),
  checkDbConnection: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_DB_CONNECTION),

  getLanguages: () => ipcRenderer.invoke(IPC_CHANNELS.GET_LANGUAGES),
  saveLanguage: (lang) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_LANGUAGE, lang),
  deleteLanguage: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_LANGUAGE, id),

  getCategories: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CATEGORIES),
  saveCategory: (cat) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CATEGORY, cat),
  deleteCategory: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_CATEGORY, id),
  assignVocabulariesToCategory: (vocabularyIds, categoryId) =>
    ipcRenderer.invoke(IPC_CHANNELS.ASSIGN_VOCABULARIES_TO_CATEGORY, vocabularyIds, categoryId),
  populateCategoryBatch: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.POPULATE_CATEGORY_BATCH, input),

  getTags: () => ipcRenderer.invoke(IPC_CHANNELS.GET_TAGS),
  saveTag: (tag) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_TAG, tag),
  deleteTag: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_TAG, id),

  getVocabularies: (filter) => ipcRenderer.invoke(IPC_CHANNELS.GET_VOCABULARIES, filter),
  saveVocabulary: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_VOCABULARY, input),
  deleteVocabulary: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_VOCABULARY, id),
  resetVocabularyProgress: (id) => ipcRenderer.invoke(IPC_CHANNELS.RESET_VOCABULARY_PROGRESS, id),

  enrichVocabulary: (req) => ipcRenderer.invoke(IPC_CHANNELS.ENRICH_VOCABULARY, req),
  fetchTtsAudio: (text, langCode) => ipcRenderer.invoke(IPC_CHANNELS.FETCH_TTS_AUDIO, text, langCode),

  startTrainingSession: (input) => ipcRenderer.invoke(IPC_CHANNELS.START_TRAINING_SESSION, input),
  submitTrainingAnswer: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUBMIT_TRAINING_ANSWER, input),

  exportVocabularies: (req) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_VOCABULARIES, req),
  importVocabularies: (req) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_VOCABULARIES, req),
  previewImport: (req) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW_IMPORT, req)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api
}
