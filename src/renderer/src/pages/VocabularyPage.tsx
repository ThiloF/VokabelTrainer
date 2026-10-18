import React, { useEffect, useState } from 'react'
import {
  Plus,
  Search,
  Sparkles,
  Volume2,
  Edit3,
  Trash2,
  RotateCcw,
  Tag as TagIcon,
  Folder,
  X,
  Check,
  Loader2
} from 'lucide-react'
import {
  CategoryDTO,
  LanguageDTO,
  SaveVocabularyInput,
  TagDTO,
  VocabularyDTO
} from '@shared/dto'
import { usePronunciation } from '../hooks/usePronunciation'

interface VocabularyPageProps {
  languages: LanguageDTO[]
  categories: CategoryDTO[]
  tags: TagDTO[]
  onDataChanged: () => void
}

export const VocabularyPage: React.FC<VocabularyPageProps> = ({
  languages,
  categories,
  tags,
  onDataChanged
}) => {
  const { speak, isPlaying } = usePronunciation()

  const [vocabularies, setVocabularies] = useState<VocabularyDTO[]>([])
  const [search, setSearch] = useState('')
  const [selectedLangId, setSelectedLangId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichStatus, setEnrichStatus] = useState<string | null>(null)
  const [visibleLimit, setVisibleLimit] = useState<number>(60)

  // Form state
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [sourceText, setSourceText] = useState('')
  const [targetTextsRaw, setTargetTextsRaw] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [phonetic, setPhonetic] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [difficulty, setDifficulty] = useState(2)
  const [sourceLanguageId, setSourceLanguageId] = useState('')
  const [targetLanguageId, setTargetLanguageId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [exampleSentence, setExampleSentence] = useState('')
  const [exampleTranslation, setExampleTranslation] = useState('')

  const loadVocabularies = async () => {
    const list = await window.electronAPI.getVocabularies({
      search: search || undefined,
      sourceLanguageId: selectedLangId || undefined,
      categoryId: selectedCategoryId || undefined,
      tagId: selectedTagId || undefined
    })
    setVocabularies(list)
  }

  useEffect(() => {
    loadVocabularies()
  }, [search, selectedLangId, selectedCategoryId, selectedTagId])

  useEffect(() => {
    if (languages.length > 0 && !sourceLanguageId) {
      const en = languages.find((l) => l.code === 'en') ?? languages[0]
      const de = languages.find((l) => l.code === 'de') ?? languages[languages.length - 1]
      setSourceLanguageId(en.id)
      setTargetLanguageId(de.id)
    }
  }, [languages])

  const openNewModal = () => {
    setEditingId(undefined)
    setSourceText('')
    setTargetTextsRaw('')
    setPartOfSpeech('')
    setPhonetic('')
    setAudioUrl('')
    setNotes('')
    setDifficulty(2)
    setCategoryId(categories[0]?.id ?? '')
    setSelectedTagNames([])
    setExampleSentence('')
    setExampleTranslation('')
    setEnrichStatus(null)
    setIsEditorOpen(true)
  }

  const openEditModal = (v: VocabularyDTO) => {
    setEditingId(v.id)
    setSourceText(v.sourceText)
    setTargetTextsRaw(v.targetTexts.join(', '))
    setPartOfSpeech(v.partOfSpeech ?? '')
    setPhonetic(v.phonetic ?? '')
    setAudioUrl(v.audioUrl ?? '')
    setNotes(v.notes ?? '')
    setDifficulty(v.difficulty)
    setSourceLanguageId(v.sourceLanguageId)
    setTargetLanguageId(v.targetLanguageId)
    setCategoryId(v.categoryId ?? '')
    setSelectedTagNames(v.tags.map((t) => t.name))
    setExampleSentence(v.examples[0]?.sentence ?? '')
    setExampleTranslation(v.examples[0]?.translation ?? '')
    setEnrichStatus(null)
    setIsEditorOpen(true)
  }

  const handleAutoEnrich = async () => {
    if (!sourceText.trim()) return
    setIsEnriching(true)
    setEnrichStatus(null)

    try {
      const srcLang = languages.find((l) => l.id === sourceLanguageId)
      const tgtLang = languages.find((l) => l.id === targetLanguageId)
      const res = await window.electronAPI.enrichVocabulary({
        word: sourceText.trim(),
        sourceLangCode: srcLang?.code ?? 'en',
        targetLangCode: tgtLang?.code ?? 'de'
      })

      if (res.translations.length > 0 && !targetTextsRaw.trim()) {
        setTargetTextsRaw(res.translations.join(', '))
      } else if (res.translations.length > 0) {
        const merged = Array.from(
          new Set([
            ...targetTextsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            ...res.translations
          ])
        )
        setTargetTextsRaw(merged.join(', '))
      }

      if (res.phonetic && !phonetic) setPhonetic(res.phonetic)
      if (res.partOfSpeech && !partOfSpeech) setPartOfSpeech(res.partOfSpeech)
      if (res.audioUrl) setAudioUrl(res.audioUrl)
      if (res.definitions.length > 0 && !notes) {
        setNotes(`Definition: ${res.definitions[0]}`)
      }
      if (res.examples.length > 0 && !exampleSentence) {
        setExampleSentence(res.examples[0].sentence)
      }

      setEnrichStatus(
        `Angereichert über ${res.providerUsed}${res.phonetic ? ` • ${res.phonetic}` : ''}`
      )
    } catch (err: any) {
      setEnrichStatus(`Enrichment fehlgeschlagen: ${err?.message ?? 'Fehler'}`)
    } finally {
      setIsEnriching(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const targets = targetTextsRaw
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (!sourceText.trim() || targets.length === 0) return

    const payload: SaveVocabularyInput = {
      id: editingId,
      sourceText: sourceText.trim(),
      targetTexts: targets,
      partOfSpeech: partOfSpeech.trim() || undefined,
      phonetic: phonetic.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      difficulty,
      sourceLanguageId,
      targetLanguageId,
      categoryId: categoryId || null,
      tagNames: selectedTagNames,
      examples: exampleSentence.trim()
        ? [
            {
              sentence: exampleSentence.trim(),
              translation: exampleTranslation.trim() || null,
              clozeWord: sourceText.trim()
            }
          ]
        : []
    }

    await window.electronAPI.saveVocabulary(payload)
    setIsEditorOpen(false)
    await loadVocabularies()
    onDataChanged()
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteVocabulary(id)
    await loadVocabularies()
    onDataChanged()
  }

  const handleResetProgress = async (id: string) => {
    await window.electronAPI.resetVocabularyProgress(id)
    await loadVocabularies()
    onDataChanged()
  }

  const toggleTagInForm = (tagName: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    )
  }

  const addCustomTagInForm = () => {
    const clean = newTagInput.trim()
    if (!clean) return
    if (!selectedTagNames.includes(clean)) {
      setSelectedTagNames((prev) => [...prev, clean])
    }
    setNewTagInput('')
  }

  const masteryBadges = [
    { label: 'Neu', cls: 'bg-stone-100 text-stone-700 border-stone-300' },
    { label: 'Lernend', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
    { label: 'Vertraut', cls: 'bg-orange-100 text-orange-900 border-orange-300' },
    { label: 'Gefestigt', cls: 'bg-yellow-100 text-yellow-900 border-yellow-400' },
    { label: 'Gemeistert', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
  ]

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Vokabel-Sammlung & Editor</h1>
          <p className="text-sm text-stone-600">
            Verwalte deine Vokabeln, Kategorien, Tags, Beispielsätze und nutze 1-Klick Auto-Enrich
            für Übersetzungen & Hörbeispiele.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold shadow-md shadow-amber-900/15 transition"
        >
          <Plus className="w-4 h-4" />
          Neue Vokabel anlegen
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-amber-900/15 p-4 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Wort, Übersetzung, Tag..."
            className="w-full pl-10 pr-4 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-700"
          />
        </div>

        <select
          value={selectedLangId}
          onChange={(e) => setSelectedLangId(e.target.value)}
          className="px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-amber-700"
        >
          <option value="">Alle Ausgangssprachen</option>
          {languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-amber-700"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
          className="px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-amber-700"
        >
          <option value="">Alle Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Vocabulary List */}
      <div className="space-y-3">
        {vocabularies.length === 0 ? (
          <div className="bg-white border border-amber-900/15 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <p className="text-stone-800 font-semibold">Keine passenden Vokabeln gefunden.</p>
            <p className="text-xs text-stone-500">
              Erstelle eine neue Vokabel oder passe deine Suchfilter an.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 px-1">
              <span>
                Zeige {Math.min(visibleLimit, vocabularies.length)} von {vocabularies.length}{' '}
                Vokabeln
              </span>
              {vocabularies.length > visibleLimit && (
                <button
                  onClick={() => setVisibleLimit((prev) => prev + 100)}
                  className="text-amber-800 hover:underline"
                >
                  +100 weitere einblenden
                </button>
              )}
            </div>
            {vocabularies.slice(0, visibleLimit).map((v) => {
            const mLevel = v.progress?.masteryLevel ?? 0
            const badge = masteryBadges[mLevel] ?? masteryBadges[0]
            return (
              <div
                key={v.id}
                className="bg-white hover:bg-amber-50/40 border border-amber-900/15 hover:border-amber-700/30 rounded-2xl p-5 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-lg" title={v.sourceLanguage?.name}>
                      {v.sourceLanguage?.flag ?? '🌐'}
                    </span>
                    <button
                      onClick={() =>
                        speak(
                          v.sourceText,
                          v.sourceLanguage?.locale ?? 'en-US',
                          v.audioUrl
                        )
                      }
                      disabled={isPlaying}
                      className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
                      title="Aussprache anhören"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold text-stone-900">{v.sourceText}</span>
                    {v.phonetic && (
                      <span className="text-xs font-mono text-stone-500">{v.phonetic}</span>
                    )}
                    {v.partOfSpeech && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900">
                        {v.partOfSpeech}
                      </span>
                    )}
                    <span className="text-amber-700 font-bold">⇔</span>
                    <span className="text-base font-bold text-amber-800">
                      {v.targetTexts.join(', ')}
                    </span>
                  </div>

                  {v.examples.length > 0 && (
                    <div className="text-xs text-stone-600 italic pl-2 border-l-2 border-amber-600">
                      „{v.examples[0].sentence}“
                      {v.examples[0].translation && (
                        <span className="not-italic text-stone-500">
                          {' '}
                          — {v.examples[0].translation}
                        </span>
                      )}
                    </div>
                  )}

                  {v.notes && <div className="text-xs text-stone-600">{v.notes}</div>}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {v.progress && (
                      <span className="text-[11px] text-stone-500 font-medium">
                        ✓ {v.progress.successCount} • ✗ {v.progress.failCount} • Intervall:{' '}
                        {v.progress.intervalDays}d
                      </span>
                    )}
                    {v.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F4EBE1] text-stone-800">
                        <Folder className="w-3 h-3 text-amber-800" />
                        {v.category.name}
                      </span>
                    )}
                    {v.tags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300"
                      >
                        <TagIcon className="w-2.5 h-2.5" />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  <button
                    onClick={() => openEditModal(v)}
                    className="p-2 rounded-xl bg-[#F4EBE1] hover:bg-amber-200/70 text-stone-800 transition"
                    title="Vokabel bearbeiten"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleResetProgress(v.id)}
                    className="p-2 rounded-xl bg-[#F4EBE1] hover:bg-amber-200/70 text-stone-600 hover:text-amber-900 transition"
                    title="Lernfortschritt zurücksetzen"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 rounded-xl bg-[#F4EBE1] hover:bg-rose-100 text-stone-600 hover:text-rose-700 transition"
                    title="Vokabel löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
            {vocabularies.length > visibleLimit && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setVisibleLimit((prev) => prev + 100)}
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-900/20 text-stone-800 text-xs font-bold shadow-sm transition"
                >
                  Weitere Vokabeln anzeigen ({vocabularies.length - visibleLimit} verbleibend)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FDF8F2] border border-amber-900/20 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-amber-900/15 pb-4">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Vokabel bearbeiten' : 'Neue Vokabel erstellen'}
              </h2>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-amber-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Languages Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Fremdsprache
                  </label>
                  <select
                    value={sourceLanguageId}
                    onChange={(e) => setSourceLanguageId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  >
                    {languages.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.flag} {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Muttersprache / Übersetzung
                  </label>
                  <select
                    value={targetLanguageId}
                    onChange={(e) => setTargetLanguageId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  >
                    {languages.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.flag} {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source Word + 1-Click Auto-Enrich */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Vokabel (Fremdwort) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="z.B. resilience, serendipity, imprescindible..."
                    className="flex-1 px-3.5 py-2.5 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900 focus:border-amber-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAutoEnrich}
                    disabled={isEnriching || !sourceText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
                  >
                    {isEnriching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Auto-Enrich (Translate & Audio)
                  </button>
                </div>
                {enrichStatus && (
                  <p className="text-xs text-amber-800 font-medium mt-1.5 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> {enrichStatus}
                  </p>
                )}
              </div>

              {/* Translations */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Deutsche Übersetzungen / Synonyme (kommagetrennt) *
                </label>
                <input
                  type="text"
                  required
                  value={targetTextsRaw}
                  onChange={(e) => setTargetTextsRaw(e.target.value)}
                  placeholder="z.B. Widerstandsfähigkeit, Belastbarkeit"
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900 focus:border-amber-700 focus:outline-none"
                />
              </div>

              {/* Phonetics, Part of Speech, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Lautschrift (IPA)
                  </label>
                  <input
                    type="text"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder="/rɪˈzɪliəns/"
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Wortart</label>
                  <input
                    type="text"
                    value={partOfSpeech}
                    onChange={(e) => setPartOfSpeech(e.target.value)}
                    placeholder="noun, verb, adjective..."
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  >
                    <option value="">— Keine Kategorie —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Example Sentence for Cloze Training */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Beispielsatz (für Lückentext-Training)
                  </label>
                  <input
                    type="text"
                    value={exampleSentence}
                    onChange={(e) => setExampleSentence(e.target.value)}
                    placeholder="Building resilience is crucial."
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Übersetzung des Beispielsatzes
                  </label>
                  <input
                    type="text"
                    value={exampleTranslation}
                    onChange={(e) => setExampleTranslation(e.target.value)}
                    placeholder="Widerstandsfähigkeit aufzubauen ist wichtig."
                    className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notizen / Eselsbrücke / Definition
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Zusätzliche Hinweise zur Verwendung..."
                  className="w-full px-3 py-2 bg-white border border-amber-900/20 rounded-xl text-sm text-stone-900"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-stone-700">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const active = selectedTagNames.includes(t.name)
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTagInForm(t.name)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition ${
                          active
                            ? 'bg-amber-700 border-amber-800 text-white'
                            : 'bg-white border-amber-900/20 text-stone-700 hover:border-amber-700'
                        }`}
                      >
                        #{t.name}
                      </button>
                    )
                  })}
                  {selectedTagNames
                    .filter((name) => !tags.some((t) => t.name === name))
                    .map((custom) => (
                      <button
                        type="button"
                        key={custom}
                        onClick={() => toggleTagInForm(custom)}
                        className="text-xs font-medium px-2.5 py-1 rounded-full border bg-amber-700 border-amber-800 text-white"
                      >
                        #{custom}
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomTagInForm()
                      }
                    }}
                    placeholder="Neuen Tag hinzufügen..."
                    className="flex-1 px-3 py-1.5 bg-white border border-amber-900/20 rounded-xl text-xs text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={addCustomTagInForm}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-xs font-semibold text-amber-900"
                  >
                    + Tag
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-amber-900/15">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white text-sm font-semibold shadow-md"
                >
                  Vokabel speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
