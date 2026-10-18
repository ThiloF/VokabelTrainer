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
  Sparkles
} from 'lucide-react'
import {
  AnswerEvaluationDTO,
  CategoryDTO,
  LanguageDTO,
  TagDTO,
  TrainingItemDTO,
  TrainingMode
} from '@shared/dto'
import { usePronunciation } from '../hooks/usePronunciation'

interface TrainerPageProps {
  initialMode: TrainingMode
  initialLanguageId?: string
  languages: LanguageDTO[]
  categories: CategoryDTO[]
  tags: TagDTO[]
  onSessionCompleted: () => void
}

export const TrainerPage: React.FC<TrainerPageProps> = ({
  initialMode,
  initialLanguageId,
  languages,
  categories,
  tags,
  onSessionCompleted
}) => {
  const { speak } = usePronunciation()

  const [mode, setMode] = useState<TrainingMode>(initialMode)
  const [sourceLangId, setSourceLangId] = useState(initialLanguageId ?? '')
  const [categoryId, setCategoryId] = useState('')
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
        .map((it) => ({ id: it.vocabulary.id, text: it.vocabulary.sourceText }))
        .sort(() => Math.random() - 0.5)
      const right = list
        .map((it) => ({
          id: it.vocabulary.id,
          text: it.vocabulary.targetTexts[0] ?? it.vocabulary.sourceText
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
  }, [initialMode, initialLanguageId])

  useEffect(() => {
    loadSession()
  }, [mode, sourceLangId, categoryId, tagId, dueOnly])

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

    const result = await window.electronAPI.submitTrainingAnswer({
      vocabularyId: currentItem.vocabulary.id,
      mode,
      givenAnswer: answerToSubmit,
      responseTimeMs: elapsed,
      currentCombo: combo
    })

    setEvaluation(result)
    setCombo(result.newCombo)
    setSessionXp((prev) => prev + result.earnedXp)
    if (result.isCorrect) setCorrectCount((prev) => prev + 1)
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

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Mode Selector & Session Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {modeTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  mode === t.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">
              <Flame className="w-4 h-4" /> Combo: {combo}x
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              <Trophy className="w-4 h-4" /> +{sessionXp} XP
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <select
            value={sourceLangId}
            onChange={(e) => setSourceLangId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
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
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
          >
            <option value="">Alle Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer px-2">
            <input
              type="checkbox"
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600"
            />
            Fällige Vokabeln bevorzugen (SM-2)
          </label>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-lg font-semibold text-white">Keine Vokabeln für diesen Filter</p>
          <p className="text-sm text-slate-400">
            Wähle eine andere Kategorie oder erstelle neue Vokabeln im Vokabel-Manager.
          </p>
        </div>
      ) : isSessionFinished ? (
        /* Session Completed Screen */
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Trainingseinheit abgeschlossen!</h2>
            <p className="text-slate-400 text-sm">
              Alle Lernintervalle wurden nach dem SM-2 Spaced-Repetition-Algorithmus aktualisiert.
            </p>
          </div>
          <div className="flex justify-center gap-8 py-4">
            <div>
              <div className="text-3xl font-bold text-amber-400">+{sessionXp} XP</div>
              <div className="text-xs text-slate-400">Verdiente Erfahrung</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400">{correctCount}</div>
              <div className="text-xs text-slate-400">Erfolgreiche Antworten</div>
            </div>
          </div>
          <button
            onClick={loadSession}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            Nächste Runde starten
          </button>
        </div>
      ) : mode === 'MATCHING' ? (
        /* Matching Game Mode */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">
              Verbinde die zusammengehörigen Wortpaare
            </h2>
            <span className="text-xs text-slate-400">
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
                    className={`w-full p-4 rounded-xl border text-left font-medium transition ${
                      isSolved
                        ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-500/40 line-through'
                        : isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-indigo-500/50'
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
                    className={`w-full p-4 rounded-xl border text-left font-medium transition ${
                      isSolved
                        ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-500/40 line-through'
                        : wrongPairFlash
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-indigo-500/50'
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Karte {currentIndex + 1} von {items.length}
            </span>
            <div className="flex items-center gap-2">
              <span>{currentItem.vocabulary.sourceLanguage?.flag}</span>
              <span>{currentItem.vocabulary.sourceLanguage?.name}</span>
              <span>→</span>
              <span>{currentItem.vocabulary.targetLanguage?.flag}</span>
              <span>{currentItem.vocabulary.targetLanguage?.name}</span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
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
                  className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30 transition transform hover:scale-105"
                >
                  <Volume2 className="w-9 h-9" />
                </button>
                <p className="text-sm text-slate-400">
                  Höre dir die Aussprache an und tippe das gehörte Wort (oder die Übersetzung) ein.
                </p>
              </div>
            ) : mode === 'CLOZE' && currentItem.clozeSentence ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                  Ergänze das fehlende Wort im Satz
                </div>
                <div className="text-2xl font-bold text-white">
                  „{currentItem.clozeSentence.maskedSentence}“
                </div>
                {currentItem.clozeSentence.translation && (
                  <div className="text-sm text-slate-400">
                    Hinweis / Bedeutung: {currentItem.clozeSentence.translation}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-3xl font-bold text-white">{currentItem.promptText}</h2>
                  <button
                    onClick={() =>
                      speak(
                        currentItem.vocabulary.sourceText,
                        currentItem.vocabulary.sourceLanguage?.locale ?? 'en-US',
                        currentItem.vocabulary.audioUrl
                      )
                    }
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 transition"
                    title="Aussprache abspielen"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {currentItem.vocabulary.phonetic && (
                  <div className="text-sm font-mono text-slate-400">
                    {currentItem.vocabulary.phonetic}
                  </div>
                )}
                {currentItem.vocabulary.partOfSpeech && (
                  <span className="inline-block text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-400">
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
                    className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg transition"
                  >
                    Karte umdrehen (Lösung anzeigen)
                  </button>
                </div>
              ) : (
                <div className="space-y-6 border-t border-slate-800 pt-6 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-emerald-400">
                      {currentItem.vocabulary.targetTexts.join(', ')}
                    </div>
                    {currentItem.vocabulary.examples[0] && (
                      <p className="text-sm text-slate-400 italic">
                        „{currentItem.vocabulary.examples[0].sentence}“
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">
                      Wie gut wusstest du diese Vokabel? (SM-2 Intervall-Steuerung)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        onClick={() => handleFlashcardRating(1)}
                        className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 text-xs font-semibold"
                      >
                        Nochmal (Sofort)
                      </button>
                      <button
                        onClick={() => handleFlashcardRating(3)}
                        className="p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 text-amber-300 text-xs font-semibold"
                      >
                        Schwer (Kurzes Intervall)
                      </button>
                      <button
                        onClick={() => handleFlashcardRating(4)}
                        className="p-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/30 text-sky-300 text-xs font-semibold"
                      >
                        Gut (Standard SM-2)
                      </button>
                      <button
                        onClick={() => handleFlashcardRating(5)}
                        className="p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
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
                    className={`p-4 rounded-xl border text-left font-medium transition ${
                      !isSelected
                        ? 'bg-slate-950 border-slate-800 hover:border-indigo-500 text-slate-200'
                        : isCorrectOption
                          ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500'
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
                      ? 'Gesuchte Vokabel eingeben...'
                      : 'Übersetzung eingeben...'
                  }
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-base text-white focus:border-indigo-500 focus:outline-none"
                />
                {!evaluation && (
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
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
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : evaluation.isAlmostRight
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base">
                  {evaluation.isCorrect && !evaluation.isAlmostRight ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Perfekt gelöst! (+{evaluation.earnedXp} XP)
                    </>
                  ) : evaluation.isAlmostRight ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      Fast richtig – kleiner Tippfehler toleriert! (+{evaluation.earnedXp} XP)
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400" />
                      Nicht ganz richtig
                    </>
                  )}
                </div>

                <span className="text-xs opacity-80">
                  Nächste Wiederholung in {evaluation.updatedProgress.intervalDays} Tag(en) (EF:{' '}
                  {evaluation.updatedProgress.easeFactor})
                </span>
              </div>

              <div className="text-sm">
                Richtige Lösung:{' '}
                <strong className="text-white">
                  {currentItem.vocabulary.targetTexts.join(', ')}
                </strong>{' '}
                <span className="text-slate-400">({currentItem.vocabulary.sourceText})</span>
              </div>

              {/* Character Diff Display when typo occurred */}
              {evaluation.diffSegments && evaluation.levenshteinDistance > 0 && (
                <div className="text-xs space-x-1">
                  <span className="text-slate-400">Buchstaben-Abgleich:</span>
                  <span className="font-mono bg-slate-950/80 px-2 py-1 rounded">
                    {evaluation.diffSegments.map((seg, i) => (
                      <span
                        key={i}
                        className={
                          seg.status === 'correct'
                            ? 'text-emerald-400'
                            : seg.status === 'typo'
                              ? 'text-amber-400 underline font-bold'
                              : 'text-rose-400 underline'
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
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
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
