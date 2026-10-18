import React, { useEffect, useState } from 'react'
import {
  Folder,
  FolderPlus,
  GraduationCap,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Target,
  Layers,
  Search,
  X,
  Volume2,
  ArrowRight
} from 'lucide-react'
import {
  CategoryDTO,
  LanguageDTO,
  TagDTO,
  TrainingMode,
  VocabularyDTO
} from '@shared/dto'
import { usePronunciation } from '../hooks/usePronunciation'

interface FoldersPageProps {
  categories: CategoryDTO[]
  languages: LanguageDTO[]
  tags: TagDTO[]
  onStartFolderTraining: (mode: TrainingMode, categoryId: string) => void
  onDataChanged: () => void
}

const AUTUMN_COLORS = [
  { label: 'Bernstein', hex: '#d97706' },
  { label: 'Terrakotta', hex: '#c2410c' },
  { label: 'Waldgrün', hex: '#15803d' },
  { label: 'Kastanie', hex: '#9a3412' },
  { label: 'Ocker', hex: '#b45309' },
  { label: 'Weinrot', hex: '#be123c' }
]

export const FoldersPage: React.FC<FoldersPageProps> = ({
  categories,
  tags,
  onStartFolderTraining,
  onDataChanged
}) => {
  const { speak } = usePronunciation()

  // New Folder Form
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState(AUTUMN_COLORS[0].hex)
  const [initialBatchCount, setInitialBatchCount] = useState<number>(15)
  const [initialBatchTagId, setInitialBatchTagId] = useState<string>('')

  // Manage Folder Modal State
  const [managingFolder, setManagingFolder] = useState<CategoryDTO | null>(null)
  const [folderVocabs, setFolderVocabs] = useState<VocabularyDTO[]>([])
  const [availableVocabs, setAvailableVocabs] = useState<VocabularyDTO[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTagId, setFilterTagId] = useState('')
  const [batchCount, setBatchCount] = useState(15)
  const [batchTagId, setBatchTagId] = useState('')
  const [onlyUnstarted, setOnlyUnstarted] = useState(true)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const refreshFolderManageLists = async (folderId: string) => {
    const [inFolder, allMatching] = await Promise.all([
      window.electronAPI.getVocabularies({ categoryId: folderId }),
      window.electronAPI.getVocabularies({
        search: searchQuery || undefined,
        tagId: filterTagId || undefined
      })
    ])
    setFolderVocabs(inFolder)
    setAvailableVocabs(allMatching.filter((v) => v.categoryId !== folderId))
  }

  useEffect(() => {
    if (managingFolder) {
      refreshFolderManageLists(managingFolder.id)
    }
  }, [managingFolder, searchQuery, filterTagId])

  // Keep managingFolder synced with updated categories prop
  useEffect(() => {
    if (managingFolder) {
      const updated = categories.find((c) => c.id === managingFolder.id)
      if (updated) setManagingFolder(updated)
    }
  }, [categories])

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const created = await window.electronAPI.saveCategory({
      name: newName.trim(),
      description: newDesc.trim() || null,
      color: newColor,
      icon: 'Folder'
    })

    if (initialBatchCount > 0) {
      await window.electronAPI.populateCategoryBatch({
        targetCategoryId: created.id,
        count: initialBatchCount,
        tagId: initialBatchTagId || undefined,
        onlyUnstarted: true
      })
    }

    setNewName('')
    setNewDesc('')
    setIsCreating(false)
    onDataChanged()
  }

  const handleDeleteFolder = async (folderId: string) => {
    await window.electronAPI.deleteCategory(folderId)
    if (managingFolder?.id === folderId) {
      setManagingFolder(null)
    }
    onDataChanged()
  }

  const handleQuickPopulate = async (folderId: string) => {
    const added = await window.electronAPI.populateCategoryBatch({
      targetCategoryId: folderId,
      count: batchCount,
      tagId: batchTagId || undefined,
      onlyUnstarted
    })
    setStatusMsg(`${added} Vokabeln wurden dem Ordner hinzugefügt.`)
    setTimeout(() => setStatusMsg(null), 3500)
    await refreshFolderManageLists(folderId)
    onDataChanged()
  }

  const handleAddSingleVocab = async (vocabId: string) => {
    if (!managingFolder) return
    await window.electronAPI.assignVocabulariesToCategory([vocabId], managingFolder.id)
    await refreshFolderManageLists(managingFolder.id)
    onDataChanged()
  }

  const handleRemoveSingleVocab = async (vocabId: string) => {
    if (!managingFolder) return
    await window.electronAPI.assignVocabulariesToCategory([vocabId], null)
    await refreshFolderManageLists(managingFolder.id)
    onDataChanged()
  }

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return { label: 'Gemeistert 🏆', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    }
    if (score >= 60) {
      return { label: 'Gut gefestigt', cls: 'bg-lime-100 text-lime-900 border-lime-300' }
    }
    if (score >= 25) {
      return { label: 'In Festigung', cls: 'bg-amber-100 text-amber-900 border-amber-300' }
    }
    return { label: 'Im Aufbau', cls: 'bg-stone-100 text-stone-700 border-stone-300' }
  }

  const trainingModes: Array<{ mode: TrainingMode; label: string }> = [
    { mode: 'FLASHCARD', label: 'Karteikarten' },
    { mode: 'TYPING', label: 'Freitext' },
    { mode: 'MULTIPLE_CHOICE', label: 'Quiz' },
    { mode: 'LISTENING', label: 'Hören' },
    { mode: 'CLOZE', label: 'Lückentext' },
    { mode: 'MATCHING', label: 'Matching' }
  ]

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Karteikarten-Ordner & Ordner-Scoring
          </h1>
          <p className="text-sm text-stone-600">
            Stelle dir eigene Lern-Ordner (z.B. 15er Tagespakete oder Themen-Decks) zusammen, verfolge
            den Ordner-Score und trainiere gezielt in allen 6 Lernmodi, bis jede Karte sitzt.
          </p>
        </div>
        <button
          onClick={() => setIsCreating((prev) => !prev)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold shadow-md shadow-amber-900/15 transition"
        >
          <FolderPlus className="w-4 h-4" />
          Neuen Karteikarten-Ordner anlegen
        </button>
      </div>

      {/* Create Folder Panel */}
      {isCreating && (
        <form
          onSubmit={handleCreateFolder}
          className="bg-white border border-amber-900/20 rounded-2xl p-6 space-y-4 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-700" />
              Neuen Karteikarten-Ordner erstellen
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ordner-Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Lernpaket Woche 1 (15 Karten)"
                className="w-full px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-900 focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Beschreibung / Lernziel
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="z.B. Intensiv-Wiederholung bis 100% Score"
                className="w-full px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-900 focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Herbst-Farbton
              </label>
              <div className="flex items-center gap-2 pt-1">
                {AUTUMN_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.hex}
                    onClick={() => setNewColor(c.hex)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      newColor === c.hex ? 'border-stone-900 scale-110 shadow' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Optional Auto-Fill on Creation */}
          <div className="p-4 rounded-xl bg-[#FDF8F2] border border-amber-900/15 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                Direkt beim Erstellen mit unstarteten Vokabeln füllen?
              </div>
              <p className="text-[11px] text-stone-600">
                Ideal für feste 15er- oder 20er-Lernpakete, die du Tag für Tag festigen möchtest.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={initialBatchCount}
                onChange={(e) => setInitialBatchCount(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-amber-900/20 rounded-xl text-xs font-semibold text-stone-800"
              >
                <option value={0}>Leer anlegen (0 Karten)</option>
                <option value={10}>10 neue Karten füllen</option>
                <option value={15}>15 neue Karten füllen (Empfohlen)</option>
                <option value={20}>20 neue Karten füllen</option>
                <option value={30}>30 neue Karten füllen</option>
              </select>

              <select
                value={initialBatchTagId}
                onChange={(e) => setInitialBatchTagId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-amber-900/20 rounded-xl text-xs font-medium text-stone-800"
              >
                <option value="">Aus allen Niveaus (B1–C2)</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    Nur Tag #{t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 text-white text-xs font-bold shadow-sm"
            >
              Ordner jetzt erstellen
            </button>
          </div>
        </form>
      )}

      {/* Folder Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((folder) => {
          const total = folder.vocabularyCount ?? 0
          const score = folder.folderScorePercent ?? 0
          const accuracy = folder.accuracyPercent ?? 0
          const newCount = folder.newCount ?? 0
          const learningCount = folder.learningCount ?? 0
          const familiarCount = folder.familiarCount ?? 0
          const confidentCount = folder.confidentCount ?? 0
          const masteredCount = folder.masteredCount ?? 0
          const badge = getScoreBadge(score)

          return (
            <div
              key={folder.id}
              className="bg-white border border-amber-900/15 rounded-2xl p-6 space-y-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Folder Header & Score Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                      style={{ backgroundColor: folder.color || '#d97706' }}
                    >
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-stone-900">{folder.name}</h3>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {folder.description || 'Karteikarten-Ordner für gezieltes Vokabeltraining'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setManagingFolder(folder)}
                      className="px-3 py-1.5 rounded-xl bg-[#F4EBE1] hover:bg-amber-200/70 text-stone-800 text-xs font-bold transition"
                    >
                      Karten ({total})
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="p-1.5 rounded-xl text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition"
                      title="Ordner löschen (Vokabeln bleiben erhalten)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Folder Scoring Dashboard Box */}
                <div className="p-4 rounded-xl bg-[#FDF8F2] border border-amber-900/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                          Ordner-Score
                        </div>
                        <div className="text-2xl font-extrabold text-amber-800">{score}%</div>
                      </div>
                      <div className="h-8 w-px bg-amber-900/15" />
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                          Trefferquote
                        </div>
                        <div className="text-lg font-bold text-stone-800">
                          {accuracy > 0 ? `${accuracy}%` : '—'}
                        </div>
                      </div>
                      <div className="h-8 w-px bg-amber-900/15" />
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-bold">
                          Gefestigt / Sitzen
                        </div>
                        <div className="text-lg font-bold text-emerald-700">
                          {familiarCount + confidentCount + masteredCount} / {total}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                        <Layers className="w-3.5 h-3.5" /> {total} Karten
                      </span>
                    </div>
                  </div>

                  {/* Multi-Segment Mastery Bar */}
                  <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden flex">
                    {total > 0 && (
                      <>
                        <div
                          className="bg-emerald-600 h-full transition-all"
                          style={{ width: `${(masteredCount / total) * 100}%` }}
                          title={`Gemeistert: ${masteredCount}`}
                        />
                        <div
                          className="bg-lime-500 h-full transition-all"
                          style={{ width: `${(confidentCount / total) * 100}%` }}
                          title={`Gefestigt: ${confidentCount}`}
                        />
                        <div
                          className="bg-amber-500 h-full transition-all"
                          style={{ width: `${(familiarCount / total) * 100}%` }}
                          title={`Vertraut: ${familiarCount}`}
                        />
                        <div
                          className="bg-orange-400 h-full transition-all"
                          style={{ width: `${(learningCount / total) * 100}%` }}
                          title={`Im Lernen: ${learningCount}`}
                        />
                      </>
                    )}
                  </div>

                  {/* Breakdown Pills */}
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[11px]">
                    <div className="p-1.5 rounded-lg bg-white border border-stone-200">
                      <div className="font-bold text-stone-700">{newCount}</div>
                      <div className="text-[10px] text-stone-500">Neu</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-orange-50/70 border border-orange-200">
                      <div className="font-bold text-orange-900">{learningCount}</div>
                      <div className="text-[10px] text-orange-800">Lernend</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200">
                      <div className="font-bold text-amber-900">{familiarCount}</div>
                      <div className="text-[10px] text-amber-800">Vertraut</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-lime-50/70 border border-lime-200">
                      <div className="font-bold text-lime-900">{confidentCount}</div>
                      <div className="text-[10px] text-lime-800">Gefestigt</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                      <div className="font-bold text-emerald-900">{masteredCount}</div>
                      <div className="text-[10px] text-emerald-800">Sitzt 100%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Training Launchers for this Folder */}
              <div className="space-y-2 pt-2 border-t border-amber-900/10">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-amber-700" />
                    Diesen Ordner jetzt üben:
                  </span>
                  <button
                    onClick={() => setManagingFolder(folder)}
                    className="text-amber-800 hover:underline text-[11px]"
                  >
                    + Vokabeln hinzufügen / verwalten
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {trainingModes.map((tm) => (
                    <button
                      key={tm.mode}
                      disabled={total === 0}
                      onClick={() => onStartFolderTraining(tm.mode, folder.id)}
                      className="px-2.5 py-2 rounded-xl bg-[#FDF8F2] hover:bg-amber-700 hover:text-white disabled:opacity-40 border border-amber-900/15 text-stone-800 text-[11px] font-bold transition text-center shadow-sm"
                    >
                      {tm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Folder Content & Assignment Modal */}
      {managingFolder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FDF8F2] border border-amber-900/20 rounded-2xl max-w-5xl w-full p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-amber-900/15 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: managingFolder.color || '#d97706' }}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    Ordner verwalten: {managingFolder.name}
                  </h2>
                  <p className="text-xs text-stone-600">
                    Aktuell {folderVocabs.length} Karten im Ordner • Ordner-Score:{' '}
                    <strong>{managingFolder.folderScorePercent ?? 0}%</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {folderVocabs.length > 0 && (
                  <button
                    onClick={() => {
                      const fId = managingFolder.id
                      setManagingFolder(null)
                      onStartFolderTraining('FLASHCARD', fId)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 text-white text-xs font-bold shadow-sm"
                  >
                    Ordner trainieren <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setManagingFolder(null)}
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-amber-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Batch Populate Bar */}
            <div className="bg-white border border-amber-900/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  Schnell-Füllen: Neues Kartenpaket in diesen Ordner legen
                </div>
                <p className="text-[11px] text-stone-500">
                  Wählt automatisch passende Vokabeln aus deinem Pool aus und legt sie in diesen
                  Ordner.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="px-3 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs font-semibold text-stone-800"
                >
                  <option value={5}>+ 5 Karten</option>
                  <option value={10}>+ 10 Karten</option>
                  <option value={15}>+ 15 Karten</option>
                  <option value={20}>+ 20 Karten</option>
                </select>

                <select
                  value={batchTagId}
                  onChange={(e) => setBatchTagId(e.target.value)}
                  className="px-3 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs font-medium text-stone-800"
                >
                  <option value="">Alle Tags / Niveaus</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.name}
                    </option>
                  ))}
                </select>

                <label className="inline-flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer px-2">
                  <input
                    type="checkbox"
                    checked={onlyUnstarted}
                    onChange={(e) => setOnlyUnstarted(e.target.checked)}
                    className="rounded border-amber-900/30 text-amber-700"
                  />
                  Nur unstartete Karten
                </label>

                <button
                  type="button"
                  onClick={() => handleQuickPopulate(managingFolder.id)}
                  className="px-4 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-sm transition"
                >
                  Jetzt füllen
                </button>
              </div>
            </div>

            {statusMsg && (
              <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                {statusMsg}
              </div>
            )}

            {/* Split View: Left = Cards inside Folder, Right = Add Cards from Pool */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[360px]">
              {/* Left Column: Current Folder Cards */}
              <div className="bg-white border border-amber-900/15 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-amber-900/10 shrink-0">
                  <h3 className="text-sm font-bold text-stone-900">
                    Karten in „{managingFolder.name}“ ({folderVocabs.length})
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    Klicke auf × zum Entfernen aus dem Ordner
                  </span>
                </div>

                <div className="overflow-y-auto space-y-2 pt-3 pr-1 flex-1">
                  {folderVocabs.length === 0 ? (
                    <div className="text-center py-12 text-xs text-stone-500">
                      Noch keine Karten in diesem Ordner. Nutze oben „Schnell-Füllen“ oder wähle
                      rechts Vokabeln aus.
                    </div>
                  ) : (
                    folderVocabs.map((v) => {
                      const lvl = v.progress?.masteryLevel ?? 0
                      const started =
                        ((v.progress?.successCount ?? 0) + (v.progress?.failCount ?? 0)) > 0
                      return (
                        <div
                          key={v.id}
                          className="p-2.5 rounded-xl bg-[#FDF8F2] border border-amber-900/15 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  speak(
                                    v.sourceText,
                                    v.sourceLanguage?.locale ?? 'en-US',
                                    v.audioUrl
                                  )
                                }
                                className="p-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-stone-900 truncate">
                                {v.sourceText}
                              </span>
                              <span className="text-xs text-amber-800 truncate">
                                ➔ {v.targetTexts.join(', ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                lvl >= 3
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : lvl === 2
                                    ? 'bg-amber-100 text-amber-900'
                                    : started
                                      ? 'bg-orange-100 text-orange-900'
                                      : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {lvl >= 3
                                ? 'Sitzt'
                                : lvl === 2
                                  ? 'Vertraut'
                                  : started
                                    ? 'Lernend'
                                    : 'Neu'}
                            </span>
                            <button
                              onClick={() => handleRemoveSingleVocab(v.id)}
                              className="p-1 rounded-lg text-stone-400 hover:text-rose-700 hover:bg-rose-50"
                              title="Aus Ordner entfernen"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Search & Add from Pool */}
              <div className="bg-white border border-amber-900/15 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="space-y-2 pb-3 border-b border-amber-900/10 shrink-0">
                  <h3 className="text-sm font-bold text-stone-900">
                    Einzelne Vokabeln aus Sammlung hinzufügen
                  </h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Wort oder Übersetzung suchen..."
                        className="w-full pl-8 pr-3 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs text-stone-900"
                      />
                    </div>
                    <select
                      value={filterTagId}
                      onChange={(e) => setFilterTagId(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs text-stone-800"
                    >
                      <option value="">Alle Tags</option>
                      {tags.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-y-auto space-y-2 pt-3 pr-1 flex-1">
                  {availableVocabs.slice(0, 60).map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-[#FDF8F2] border border-amber-900/15 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {v.sourceText}{' '}
                          <span className="font-normal text-stone-500">
                            ({v.targetTexts.join(', ')})
                          </span>
                        </div>
                        {v.category && (
                          <div className="text-[10px] text-amber-800">
                            Aktuell in: {v.category.name}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddSingleVocab(v.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-700 text-amber-950 hover:text-white text-xs font-bold transition shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> In Ordner
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
