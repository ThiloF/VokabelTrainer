import React from 'react'
import {
  Flame,
  Trophy,
  Clock,
  BookOpen,
  Play,
  Target,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Keyboard,
  Volume2,
  FileText,
  Layers
} from 'lucide-react'
import { DashboardStatsDTO, TrainingMode } from '@shared/dto'

interface DashboardPageProps {
  stats: DashboardStatsDTO | null
  onStartTraining: (mode: TrainingMode, sourceLanguageId?: string) => void
  onNavigateToVocabularies: () => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  onStartTraining,
  onNavigateToVocabularies
}) => {
  if (!stats) {
    return (
      <div className="p-8 text-stone-500 animate-pulse">
        Lade Lernstatistiken und Dashboard...
      </div>
    )
  }

  const { profile, masteryDistribution } = stats
  const xpProgress = Math.min(
    100,
    Math.round(
      ((profile.totalXp - profile.xpForCurrentLevel) /
        Math.max(1, profile.xpForNextLevel - profile.xpForCurrentLevel)) *
        100
    )
  )
  const dailyProgress = Math.min(
    100,
    Math.round((profile.reviewedTodayCount / Math.max(1, profile.dailyGoalCards)) * 100)
  )

  const quickModes: Array<{
    mode: TrainingMode
    title: string
    subtitle: string
    icon: React.ReactNode
    accent: string
  }> = [
    {
      mode: 'TYPING',
      title: 'Freitext-Training',
      subtitle: 'Deutsch ⇔ Fremdsprache mit Tippfehler-Toleranz',
      icon: <Keyboard className="w-5 h-5" />,
      accent: 'from-amber-700 to-orange-700'
    },
    {
      mode: 'FLASHCARD',
      title: 'Karteikarten (SM-2)',
      subtitle: 'Klassisches Flip & Selbstbewertung',
      icon: <Layers className="w-5 h-5" />,
      accent: 'from-emerald-700 to-teal-700'
    },
    {
      mode: 'LISTENING',
      title: 'Hörverständnis',
      subtitle: 'Audio hören & Vokabel erkennen',
      icon: <Volume2 className="w-5 h-5" />,
      accent: 'from-orange-600 to-red-700'
    },
    {
      mode: 'CLOZE',
      title: 'Lückentext-Modus',
      subtitle: 'Wörter im Satzkontext ergänzen',
      icon: <FileText className="w-5 h-5" />,
      accent: 'from-yellow-700 to-amber-800'
    },
    {
      mode: 'MULTIPLE_CHOICE',
      title: 'Multiple-Choice',
      subtitle: 'Schnelles Erkennen unter 4 Optionen',
      icon: <CheckCircle2 className="w-5 h-5" />,
      accent: 'from-rose-700 to-red-800'
    },
    {
      mode: 'MATCHING',
      title: 'Paare Zuordnen',
      subtitle: 'Spielerisches Speed-Matching',
      icon: <Sparkles className="w-5 h-5" />,
      accent: 'from-stone-700 to-amber-900'
    }
  ]

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Hero in warm autumn gradient */}
      <div className="bg-gradient-to-r from-[#F6E6D4] via-[#FAF0E4] to-[#FDF8F2] border border-amber-900/15 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-800/10 border border-amber-800/20 text-amber-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            Spaced Repetition (SM-2) + Richtungswechsel aktiv
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
            Willkommen zurück im VokabelTrainer!
          </h1>
          <p className="text-stone-600 text-sm max-w-2xl">
            Du hast aktuell{' '}
            <span className="text-amber-800 font-bold">{stats.dueNowCount} Vokabeln</span> zur
            Wiederholung fällig. Trainiere wahlweise <strong>Deutsch → Fremdsprache</strong>,{' '}
            <strong>Fremdsprache → Deutsch</strong> oder im Wechsel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onStartTraining('TYPING')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold shadow-md shadow-amber-900/15 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            Training starten ({stats.dueNowCount} fällig)
          </button>
          <button
            onClick={onNavigateToVocabularies}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-amber-50 text-stone-800 font-semibold border border-amber-900/20 shadow-sm transition"
          >
            <BookOpen className="w-4 h-4 text-amber-800" />
            Vokabeln verwalten
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Level & XP */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Spieler-Level
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-stone-900">Level {profile.level}</div>
            <div className="text-xs font-bold text-amber-800">{profile.totalXp} XP</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-orange-600 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-500">
              Noch {Math.max(0, profile.xpForNextLevel - profile.totalXp)} XP bis Level{' '}
              {profile.level + 1}
            </p>
          </div>
        </div>

        {/* Daily Streak */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Lern-Streak
            </span>
            <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-stone-900">{profile.currentStreak} Tage</div>
            <div className="text-xs text-stone-500 font-medium">Rekord: {profile.longestStreak}d</div>
          </div>
          <p className="text-xs text-stone-500">
            Täglich mindestens eine Vokabel wiederholen, um die Serie zu halten.
          </p>
        </div>

        {/* Daily Goal */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tagesziel
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-stone-900">
              {profile.reviewedTodayCount} / {profile.dailyGoalCards}
            </div>
            <div className="text-xs font-bold text-emerald-700">{dailyProgress}%</div>
          </div>
          <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        {/* Accuracy & Total */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Trefferquote
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-stone-900">{stats.overallAccuracy}%</div>
            <div className="text-xs text-stone-500 font-medium">{stats.totalReviews} Abfragen</div>
          </div>
          <p className="text-xs text-stone-500">
            Gesamter Wortschatz: <strong className="text-stone-800">{stats.totalVocabularies}</strong>{' '}
            Einträge
          </p>
        </div>
      </div>

      {/* 6 Training Modes Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-700" />
          Trainingsmodus direkt starten
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickModes.map((m) => (
            <button
              key={m.mode}
              onClick={() => onStartTraining(m.mode)}
              className="group text-left bg-white hover:bg-amber-50/60 border border-amber-900/15 hover:border-amber-700/40 rounded-2xl p-5 transition flex items-start gap-4 shadow-sm"
            >
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${m.accent} text-white shadow-md group-hover:scale-105 transition`}
              >
                {m.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-stone-900 group-hover:text-amber-800 transition">
                  {m.title}
                </div>
                <div className="text-xs text-stone-600 mt-1">{m.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mastery Distribution & Languages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery Progress */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-stone-900">Gedächtnis-Stufen (SM-2 Mastery)</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Neu / Ungelernt',
                count: masteryDistribution.newCount,
                color: 'bg-stone-400'
              },
              {
                label: 'Lernend (Intervall 1 Tag)',
                count: masteryDistribution.learningCount,
                color: 'bg-amber-500'
              },
              {
                label: 'Vertraut (2–6 Tage)',
                count: masteryDistribution.familiarCount,
                color: 'bg-orange-500'
              },
              {
                label: 'Gefestigt (1–3 Wochen)',
                count: masteryDistribution.confidentCount,
                color: 'bg-amber-700'
              },
              {
                label: 'Gemeistert (> 21 Tage)',
                count: masteryDistribution.masteredCount,
                color: 'bg-emerald-600'
              }
            ].map((row) => {
              const pct =
                stats.totalVocabularies > 0
                  ? Math.round((row.count / stats.totalVocabularies) * 100)
                  : 0
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-700 font-medium">{row.label}</span>
                    <span className="text-stone-500 font-semibold">
                      {row.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Languages Overview */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-stone-900">Sprachen im Wortschatz</h3>
          {stats.languageCounts.length === 0 ? (
            <p className="text-sm text-stone-500">
              Noch keine Vokabeln vorhanden. Lege neue Vokabeln an oder importiere eine Sammlung!
            </p>
          ) : (
            <div className="space-y-3">
              {stats.languageCounts.map((item) => (
                <div
                  key={item.language.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#FDF8F2] border border-amber-900/15"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.language.flag}</span>
                    <div>
                      <div className="font-bold text-stone-900">{item.language.name}</div>
                      <div className="text-xs text-stone-600">
                        {item.count} Vokabeln gesamt •{' '}
                        <span className="text-amber-800 font-semibold">{item.dueCount} fällig</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onStartTraining('TYPING', item.language.id)}
                    className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-sm transition"
                  >
                    Üben
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
