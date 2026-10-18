import React, { useEffect, useState } from 'react'
import {
  Volume2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Flame,
  Trophy,
  RotateCcw,
  Sparkles,
  ArrowLeftRight
} from 'lucide-react'
import {
  AnswerEvaluationDTO,
  CardFocusMode,
  CategoryDTO,
  LanguageDTO,
  QueryDirection,
  TagDTO,
  TrainingItemDTO,
  TrainingMode
} from '@shared/dto'
import { usePronunciation } from '../hooks/usePronunciation'

interface TrainerPageProps {
  initialMode: TrainingMode
  initialLanguageId?: string
  initialCategoryId?: string
  languages: LanguageDTO[]
  categories: CategoryDTO[]
  tags: TagDTO[]
  onSessionCompleted: () => void
}

export const TrainerPage: React.FC<TrainerPageProps> = ({
  initialMode,
  initialLanguageId,
  initialCategoryId,
  languages,
  categories,
  tags,
  onSessionCompleted
}) => {
  const { speak } = usePronunciation()

  const [mode, setMode] = useState<TrainingMode>(initialMode)
  // Default direction: TARGET_TO_SOURCE = Deutsch -> Fremdsprache (wie gewünscht!)
  const [direction, setDirection] = useState<QueryDirection>('TARGET_TO_SOURCE')
  const [focusMode, setFocusMode] = useState<CardFocusMode>('CONSOLIDATE_FIRST')
  const [sourceLangId, setSourceLangId] = useState(initialLanguageId ?? '')
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? '')
  const [tagId, setTagId] = useState('')
  const [dueOnly, setDueOnly] = useState(true)

  const [items, setItems] = useState<TrainingItemDTO[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<AnswerEvaluationDTO | null>(null)
  const [combo, setCombo] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [isSessionFinished, setIsSessionFinished] = useState(false)

  // Matching Game State
  const [matchingLeft, setMatchingLeft] = useState<Array<{ id: string; text: string }>>([])
  const [matchingRight, setMatchingRight] = useState<Array<{ id: string; text: string }>>([])
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<string[]>([])
  const [wrongPairFlash, setWrongPairFlash] = useState(false)

  const loadSession = async () => {
    const list = await window.electronAPI.startTrainingSession({
      mode,
      direction,
      focusMode,
      sourceLanguageId: sourceLangId || undefined,
      categoryId: categoryId || undefined,
      tagId: tagId || undefined,
      dueOnly,
      limit: mode === 'MATCHING' ? 6 : 15
    })
    setItems(list)
    setCurrentIndex(0)
    setIsFlipped(false)
    setTypedAnswer('')
    setEvaluation(null)
    setIsSessionFinished(false)
    setQuestionStartTime(Date.now())

    if (mode === 'MATCHING') {
      const left = list
        .map((it) => ({
          id: it.vocabulary.id,
          text:
            direction === 'TARGET_TO_SOURCE'
              ? (it.vocabulary.targetTexts[0] ?? it.vocabulary.sourceText)
              : it.vocabulary.sourceText
        }))
        .sort(() => Math.random() - 0.5)
      const right = list
        .map((it) => ({
          id: it.vocabulary.id,
          text:
            direction === 'TARGET_TO_SOURCE'
              ? it.vocabulary.sourceText
              : (it.vocabulary.targetTexts[0] ?? it.vocabulary.sourceText)
        }))
        .sort(() => Math.random() - 0.5)
      setMatchingLeft(left)
      setMatchingRight(right)
      setSelectedLeftId(null)
      setMatchedIds([])
    }
  }

  useEffect(() => {
    setMode(initialMode)
    if (initialLanguageId !== undefined) {
      setSourceLangId(initialLanguageId)
    }
    if (initialCategoryId !== undefined) {
      setCategoryId(initialCategoryId)
    }
  }, [initialMode, initialLanguageId, initialCategoryId])

  useEffect(() => {
    loadSession()
  }, [mode, direction, focusMode, sourceLangId, categoryId, tagId, dueOnly])

  const currentItem = items[currentIndex]

  // Auto-play audio in LISTENING mode when card changes
  useEffect(() => {
    if (mode === 'LISTENING' && currentItem && !evaluation) {
      speak(
        currentItem.vocabulary.sourceText,
        currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
        currentItem.vocabulary.audioUrl
      )
    }
  }, [currentIndex, mode, currentItem, evaluation])

  const handleSubmitTextOrChoice = async (answerToSubmit: string) => {
    if (!currentItem || evaluation) return
    const elapsed = Date.now() - questionStartTime

    const expectedForMode =
      mode === 'LISTENING' || mode === 'CLOZE'
        ? [currentItem.vocabulary.sourceText, ...currentItem.vocabulary.targetTexts]
        : currentItem.expectedAnswers

    const result = await window.electronAPI.submitTrainingAnswer({
      vocabularyId: currentItem.vocabulary.id,
      mode,
      givenAnswer: answerToSubmit,
      expectedAnswers: expectedForMode,
      responseTimeMs: elapsed,
      currentCombo: combo
    })

    setEvaluation(result)
    setCombo(result.newCombo)
    setSessionXp((prev) => prev + result.earnedXp)
    if (result.isCorrect) setCorrectCount((prev) => prev + 1)

    // Automatically speak foreign word after solving when translating Deutsch -> Fremdsprache
    if (currentItem.isReversed && mode !== 'LISTENING') {
      speak(
        currentItem.vocabulary.sourceText,
        currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
        currentItem.vocabulary.audioUrl
      )
    }

    onSessionCompleted()
  }

  const handleFlashcardRating = async (quality: number) => {
    if (!currentItem) return
    const elapsed = Date.now() - questionStartTime

    const result = await window.electronAPI.submitTrainingAnswer({
      vocabularyId: currentItem.vocabulary.id,
      mode: 'FLASHCARD',
      selfRatingQuality: quality,
      responseTimeMs: elapsed,
      currentCombo: combo
    })

    setCombo(result.newCombo)
    setSessionXp((prev) => prev + result.earnedXp)
    if (result.isCorrect) setCorrectCount((prev) => prev + 1)
    onSessionCompleted()
    handleNextCard()
  }

  const handleNextCard = () => {
    if (currentIndex + 1 >= items.length) {
      setIsSessionFinished(true)
    } else {
      setCurrentIndex((prev) => prev + 1)
      setIsFlipped(false)
      setTypedAnswer('')
      setEvaluation(null)
      setQuestionStartTime(Date.now())
    }
  }

  const handleMatchingSelectRight = async (rightId: string) => {
    if (!selectedLeftId) return
    if (selectedLeftId === rightId) {
      const nextMatched = [...matchedIds, rightId]
      setMatchedIds(nextMatched)
      setSelectedLeftId(null)

      const res = await window.electronAPI.submitTrainingAnswer({
        vocabularyId: rightId,
        mode: 'MATCHING',
        selfRatingQuality: 5,
        responseTimeMs: 2500,
        currentCombo: combo
      })
      setCombo(res.newCombo)
      setSessionXp((prev) => prev + res.earnedXp)
      setCorrectCount((prev) => prev + 1)
      onSessionCompleted()

      if (nextMatched.length === matchingLeft.length) {
        setIsSessionFinished(true)
      }
    } else {
      setWrongPairFlash(true)
      setCombo(0)
      setTimeout(() => {
        setWrongPairFlash(false)
        setSelectedLeftId(null)
      }, 600)
    }
  }

  const modeTabs: Array<{ id: TrainingMode; label: string }> = [
    { id: 'TYPING', label: 'Freitext' },
    { id: 'FLASHCARD', label: 'Karteikarten' },
    { id: 'MULTIPLE_CHOICE', label: 'Multiple-Choice' },
    { id: 'LISTENING', label: 'Hörverständnis' },
    { id: 'CLOZE', label: 'Lückentext' },
    { id: 'MATCHING', label: 'Matching-Spiel' }
  ]

  const directionOptions: Array<{ id: QueryDirection; label: string }> = [
    { id: 'TARGET_TO_SOURCE', label: '🇩🇪 Deutsch ➔ 🌐 Fremdsprache' },
    { id: 'SOURCE_TO_TARGET', label: '🌐 Fremdsprache ➔ 🇩🇪 Deutsch' },
    { id: 'MIXED', label: '🔀 Gemischt (Zufallsrichtung)' }
  ]

  const focusOptions: Array<{ id: CardFocusMode; label: string; hint: string }> = [
    {
      id: 'CONSOLIDATE_FIRST',
      label: '🛡️ Erst festigen, dann Neue (Empfohlen)',
      hint: 'Angefangene Karten werden wiederholt, bis sie sitzen – erst danach kommen neue dazu.'
    },
    {
      id: 'ACTIVE_ONLY',
      label: '🔁 Nur angefangene Karten',
      hint: 'Übt ausschließlich Vokabeln, die du bereits mindestens einmal angeschaut hast.'
    },
    {
      id: 'NEW_ONLY',
      label: '✨ Neue Karten entdecken',
      hint: 'Zeigt bevorzugt noch ungesehene Vokabeln.'
    },
    {
      id: 'ALL_SHUFFLE',
      label: '🔀 Alle zufällig mischen',
      hint: 'Zufällige Auswahl aus dem aktuellen Filter.'
    }
  ]

  const selectedFolder = categories.find((c) => c.id === categoryId)

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Mode Selector & Direction Bar */}
      <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {modeTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  mode === t.id
                    ? 'bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-md shadow-amber-900/15'
                    : 'bg-[#FDF8F2] text-stone-700 hover:bg-amber-100/60 border border-amber-900/15'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100 text-orange-800 font-bold border border-orange-300">
              <Flame className="w-4 h-4 text-orange-600" /> Combo: {combo}x
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold border border-amber-300">
              <Trophy className="w-4 h-4 text-amber-700" /> +{sessionXp} XP
            </span>
          </div>
        </div>

        {/* Language Direction Selector (Prominent!) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-900/10">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
            <ArrowLeftRight className="w-4 h-4 text-amber-700" />
            Abfragerichtung:
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {directionOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDirection(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  direction === opt.id
                    ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                    : 'bg-[#FDF8F2] text-stone-700 border-amber-900/20 hover:bg-amber-100/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Consolidation / Card Focus Strategy Selector */}
        <div className="space-y-2 pt-3 border-t border-amber-900/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-stone-700">
              Karten-Auswahl & Wiederholungs-Strategie:
            </span>
            <span className="text-[11px] text-amber-900/80 font-medium">
              {focusOptions.find((f) => f.id === focusMode)?.hint}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {focusOptions.map((f) => (
              <button
                key={f.id}
                onClick={() => setFocusMode(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition ${
                  focusMode === f.id
                    ? 'bg-amber-100 border-amber-700 text-amber-950 shadow-sm'
                    : 'bg-[#FDF8F2] border-amber-900/15 text-stone-700 hover:bg-amber-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-amber-900/10">
          <select
            value={sourceLangId}
            onChange={(e) => setSourceLangId(e.target.value)}
            className="px-3 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs font-medium text-stone-800"
          >
            <option value="">Alle Sprachen</option>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs font-bold text-amber-950"
          >
            <option value="">📁 Alle Karteikarten-Ordner</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                📁 {c.name} ({c.vocabularyCount ?? 0} • Score {c.folderScorePercent ?? 0}%)
              </option>
            ))}
          </select>

          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            className="px-3 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-xs font-medium text-stone-800"
          >
            <option value="">Alle Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer px-2">
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              className="rounded border-amber-900/30 text-amber-700 focus:ring-amber-600"
            />
            Fällige bevorzugen (SM-2)
          </label>
        </div>

        {/* Live Folder Score Banner when practicing a specific Karteikarten-Ordner */}
        {selectedFolder && (
          <div className="p-3.5 rounded-xl bg-[#FDF8F2] border border-amber-700/25 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-8 rounded-full"
                style={{ backgroundColor: selectedFolder.color || '#d97706' }}
              />
              <div>
                <div className="text-xs font-bold text-stone-900">
                  Aktiver Ordner: {selectedFolder.name} ({selectedFolder.vocabularyCount ?? 0}{' '}
                  Karten)
                </div>
                <div className="text-[11px] text-stone-600">
                  Neu: <strong>{selectedFolder.newCount ?? 0}</strong> • Im Lernen:{' '}
                  <strong>{selectedFolder.learningCount ?? 0}</strong> • Vertraut/Gefestigt:{' '}
                  <strong>
                    {(selectedFolder.familiarCount ?? 0) + (selectedFolder.confidentCount ?? 0)}
                  </strong>{' '}
                  • Sitzt 100%: <strong>{selectedFolder.masteredCount ?? 0}</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                  Trefferquote
                </div>
                <div className="text-sm font-bold text-stone-800">
                  {(selectedFolder.accuracyPercent ?? 0) > 0
                    ? `${selectedFolder.accuracyPercent}%`
                    : '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">
                  Ordner-Score
                </div>
                <div className="text-lg font-extrabold text-amber-800">
                  {selectedFolder.folderScorePercent ?? 0}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="bg-white border border-amber-900/15 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <p className="text-lg font-bold text-stone-900">Keine Vokabeln für diesen Filter</p>
          <p className="text-sm text-stone-600">
            Wähle eine andere Kategorie oder erstelle neue Vokabeln im Vokabel-Manager.
          </p>
        </div>
      ) : isSessionFinished ? (
        /* Session Completed Screen */
        <div className="bg-white border border-amber-900/20 rounded-2xl p-10 text-center space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-stone-900">Trainingseinheit abgeschlossen!</h2>
            <p className="text-stone-600 text-sm">
              Alle Lernintervalle wurden nach dem SM-2 Spaced-Repetition-Algorithmus aktualisiert.
            </p>
          </div>
          <div className="flex justify-center gap-8 py-4">
            <div>
              <div className="text-3xl font-bold text-amber-700">+{sessionXp} XP</div>
              <div className="text-xs text-stone-500 font-medium">Verdiente Erfahrung</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-700">{correctCount}</div>
              <div className="text-xs text-stone-500 font-medium">Erfolgreiche Antworten</div>
            </div>
          </div>
          <button
            onClick={loadSession}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold shadow-md transition"
          >
            <RotateCcw className="w-4 h-4" />
            Nächste Runde starten
          </button>
        </div>
      ) : mode === 'MATCHING' ? (
        /* Matching Game Mode */
        <div className="bg-white border border-amber-900/15 rounded-2xl p-8 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-stone-900">
              Verbinde die zusammengehörigen Wortpaare
            </h2>
            <span className="text-xs font-semibold text-stone-500">
              {matchedIds.length} / {matchingLeft.length} gelöst
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              {matchingLeft.map((item) => {
                const isSolved = matchedIds.includes(item.id)
                const isSelected = selectedLeftId === item.id
                return (
                  <button
                    key={item.id}
                    disabled={isSolved}
                    onClick={() => setSelectedLeftId(item.id)}
                    className={`w-full p-4 rounded-xl border text-left font-semibold transition ${
                      isSolved
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700/40 line-through'
                        : isSelected
                          ? 'bg-amber-700 border-amber-800 text-white shadow-md'
                          : 'bg-[#FDF8F2] border-amber-900/20 text-stone-800 hover:border-amber-600'
                    }`}
                  >
                    {item.text}
                  </button>
                )
              })}
            </div>

            <div className="space-y-3">
              {matchingRight.map((item) => {
                const isSolved = matchedIds.includes(item.id)
                return (
                  <button
                    key={item.id}
                    disabled={isSolved}
                    onClick={() => handleMatchingSelectRight(item.id)}
                    className={`w-full p-4 rounded-xl border text-left font-semibold transition ${
                      isSolved
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700/40 line-through'
                        : wrongPairFlash
                          ? 'bg-rose-100 border-rose-400 text-rose-900'
                          : 'bg-[#FDF8F2] border-amber-900/20 text-stone-800 hover:border-amber-600'
                    }`}
                  >
                    {item.text}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Card Arena (TYPING, FLASHCARD, MULTIPLE_CHOICE, LISTENING, CLOZE) */
        <div className="bg-white border border-amber-900/15 rounded-2xl p-8 space-y-6 shadow-md">
          {/* Progress Header showing actual direction for current card */}
          <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
            <span>
              Karte {currentIndex + 1} von {items.length}
            </span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF8F2] border border-amber-900/15 text-stone-800 font-semibold">
              <span>{currentItem.promptLanguage.flag}</span>
              <span>{currentItem.promptLanguage.name}</span>
              <span className="text-amber-700">➔</span>
              <span>{currentItem.answerLanguage.flag}</span>
              <span>{currentItem.answerLanguage.name}</span>
            </div>
          </div>

          <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-orange-600 transition-all duration-300"
              style={{ width: `${Math.round(((currentIndex + 1) / items.length) * 100)}%` }}
            />
          </div>

          {/* Prompt Display */}
          <div className="py-6 text-center space-y-4">
            {mode === 'LISTENING' ? (
              <div className="space-y-3">
                <button
                  onClick={() =>
                    speak(
                      currentItem.vocabulary.sourceText,
                      currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
                      currentItem.vocabulary.audioUrl
                    )
                  }
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-900/20 transition transform hover:scale-105"
                >
                  <Volume2 className="w-9 h-9" />
                </button>
                <p className="text-sm text-stone-600">
                  Höre dir die Aussprache an und tippe das gehörte Wort (oder die Übersetzung) ein.
                </p>
              </div>
            ) : mode === 'CLOZE' && currentItem.clozeSentence ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-amber-800 font-bold">
                  Ergänze das fehlende Wort ({currentItem.vocabulary.sourceLanguage?.name})
                </div>
                <div className="text-2xl font-bold text-stone-900">
                  „{currentItem.clozeSentence.maskedSentence}“
                </div>
                {currentItem.clozeSentence.translation && (
                  <div className="text-sm text-stone-600 font-medium">
                    Bedeutung: {currentItem.clozeSentence.translation}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-amber-800 font-bold">
                  Gesucht wird die Übersetzung auf {currentItem.answerLanguage.flag}{' '}
                  {currentItem.answerLanguage.name}:
                </div>
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-3xl font-bold text-stone-900">{currentItem.promptText}</h2>
                  {!currentItem.isReversed && (
                    <button
                      onClick={() =>
                        speak(
                          currentItem.vocabulary.sourceText,
                          currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
                          currentItem.vocabulary.audioUrl
                        )
                      }
                      className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition"
                      title="Aussprache abspielen"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {!currentItem.isReversed && currentItem.vocabulary.phonetic && (
                  <div className="text-sm font-mono text-stone-500">
                    {currentItem.vocabulary.phonetic}
                  </div>
                )}
                {currentItem.vocabulary.partOfSpeech && (
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-100/80 text-amber-900">
                    {currentItem.vocabulary.partOfSpeech}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Interactive Area by Mode */}
          {mode === 'FLASHCARD' ? (
            <div className="space-y-6">
              {!isFlipped ? (
                <div className="text-center">
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold shadow-md transition"
                  >
                    Karte umdrehen (Lösung anzeigen)
                  </button>
                </div>
              ) : (
                <div className="space-y-6 border-t border-amber-900/15 pt-6 text-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-2xl font-bold text-emerald-700">
                        {currentItem.expectedAnswers.join(', ')}
                      </div>
                      <button
                        onClick={() =>
                          speak(
                            currentItem.vocabulary.sourceText,
                            currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
                            currentItem.vocabulary.audioUrl
                          )
                        }
                        className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900"
                        title="Aussprache anhören"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    {currentItem.vocabulary.phonetic && (
                      <div className="text-xs font-mono text-stone-500">
                        {currentItem.vocabulary.phonetic}
                      </div>
                    )}
                    {currentItem.vocabulary.examples[0] && (
                      <p className="text-sm text-stone-600 italic">
                        „{currentItem.vocabulary.examples[0].sentence}“
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-stone-500 font-medium">
                      Wie gut wusstest du diese Vokabel? (SM-2 Intervall-Steuerung)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        onClick={() => handleFlashcardRating(1)}
                        className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold"
                      >
                        Nochmal (Sofort)
                      </button>
                      <button
                        onClick={() => handleFlashcardRating(3)}
                        className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold"
                      >
                        Schwer (Kurzes Intervall)
                      </button>
                      <button
                        onClick={() => handleFlashcardRating(4)}
                        className="p-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-900 text-xs font-bold"
                      >
                        Gut (Standard SM-2)
                      </button>
                      <button
                        onClick={() => handleFlashcardRating(5)}
                        className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold"
                      >
                        Einfach (Großer Sprung)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : mode === 'MULTIPLE_CHOICE' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentItem.multipleChoiceOptions.map((option) => {
                const isSelected = Boolean(evaluation)
                const isCorrectOption = currentItem.expectedAnswers.some(
                  (a) => a.toLowerCase() === option.toLowerCase()
                )
                return (
                  <button
                    key={option}
                    disabled={isSelected}
                    onClick={() => handleSubmitTextOrChoice(option)}
                    className={`p-4 rounded-xl border text-left font-semibold transition ${
                      !isSelected
                        ? 'bg-[#FDF8F2] border-amber-900/20 hover:border-amber-700 text-stone-800'
                        : isCorrectOption
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          : 'bg-stone-100 border-stone-200 text-stone-400'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          ) : (
            /* TYPING, LISTENING, CLOZE Input Form */
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (evaluation) {
                  handleNextCard()
                } else {
                  handleSubmitTextOrChoice(typedAnswer)
                }
              }}
              className="space-y-4"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  autoFocus
                  disabled={Boolean(evaluation)}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder={
                    mode === 'CLOZE' || mode === 'LISTENING'
                      ? `Vokabel auf ${currentItem.vocabulary.sourceLanguage?.name ?? 'Fremdsprache'} eingeben...`
                      : `Übersetzung auf ${currentItem.answerLanguage.name} eingeben...`
                  }
                  className="flex-1 px-4 py-3 bg-[#FDF8F2] border border-amber-900/25 rounded-xl text-base text-stone-900 placeholder-stone-400 focus:border-amber-700 focus:outline-none"
                />
                {!evaluation && (
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold shadow-sm transition"
                  >
                    Prüfen
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Evaluation Result Banner */}
          {evaluation && (
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                evaluation.isCorrect && !evaluation.isAlmostRight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : evaluation.isAlmostRight
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base">
                  {evaluation.isCorrect && !evaluation.isAlmostRight ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      Perfekt gelöst! (+{evaluation.earnedXp} XP)
                    </>
                  ) : evaluation.isAlmostRight ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                      Fast richtig – kleiner Tippfehler toleriert! (+{evaluation.earnedXp} XP)
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-700" />
                      Nicht ganz richtig
                    </>
                  )}
                </div>

                <span className="text-xs font-medium opacity-80">
                  Nächste Wiederholung in {evaluation.updatedProgress.intervalDays} Tag(en) (EF:{' '}
                  {evaluation.updatedProgress.easeFactor})
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span>Richtige Lösung:</span>
                <strong className="text-stone-900 font-bold">
                  {currentItem.expectedAnswers.join(', ')}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    speak(
                      currentItem.vocabulary.sourceText,
                      currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
                      currentItem.vocabulary.audioUrl
                    )
                  }
                  className="p-1 rounded-lg bg-amber-200/70 hover:bg-amber-300 text-amber-950 transition"
                  title="Aussprache anhören"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                {currentItem.vocabulary.phonetic && (
                  <span className="text-xs font-mono text-stone-600">
                    {currentItem.vocabulary.phonetic}
                  </span>
                )}
              </div>

              {/* Character Diff Display when typo occurred */}
              {evaluation.diffSegments && evaluation.levenshteinDistance > 0 && (
                <div className="text-xs space-x-1">
                  <span className="text-stone-600 font-medium">Buchstaben-Abgleich:</span>
                  <span className="font-mono bg-white border border-amber-900/15 px-2.5 py-1 rounded">
                    {evaluation.diffSegments.map((seg, i) => (
                      <span
                        key={i}
                        className={
                          seg.status === 'correct'
                            ? 'text-emerald-700 font-semibold'
                            : seg.status === 'typo'
                              ? 'text-amber-700 underline font-bold'
                              : 'text-rose-700 underline font-bold'
                        }
                      >
                        {seg.text}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextCard}
                  autoFocus
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold shadow-sm transition"
                >
                  Weiter <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
