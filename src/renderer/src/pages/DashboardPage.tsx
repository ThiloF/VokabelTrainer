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
      <div className="p-8 text-slate-400 animate-pulse">
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
      subtitle: 'Mit intelligenter Tippfehler-Toleranz',
      icon: <Keyboard className="w-5 h-5" />,
      accent: 'from-indigo-500 to-purple-600'
    },
    {
      mode: 'FLASHCARD',
      title: 'Karteikarten (SM-2)',
      subtitle: 'Klassisches Flip & Selbstbewertung',
      icon: <Layers className="w-5 h-5" />,
      accent: 'from-emerald-500 to-teal-600'
    },
    {
      mode: 'LISTENING',
      title: 'Hörverständnis',
      subtitle: 'Audio hören & Vokabel erkennen',
      icon: <Volume2 className="w-5 h-5" />,
      accent: 'from-amber-500 to-orange-600'
    },
    {
      mode: 'CLOZE',
      title: 'Lückentext-Modus',
      subtitle: 'Wörter im Satzkontext ergänzen',
      icon: <FileText className="w-5 h-5" />,
      accent: 'from-sky-500 to-blue-600'
    },
    {
      mode: 'MULTIPLE_CHOICE',
      title: 'Multiple-Choice',
      subtitle: 'Schnelles Erkennen unter 4 Optionen',
      icon: <CheckCircle2 className="w-5 h-5" />,
      accent: 'from-pink-500 to-rose-600'
    },
    {
      mode: 'MATCHING',
      title: 'Paare Zuordnen',
      subtitle: 'Spielerisches Speed-Matching',
      icon: <Sparkles className="w-5 h-5" />,
      accent: 'from-violet-500 to-fuchsia-600'
    }
  ]

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Hero */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Spaced Repetition (SM-2) + Gamification aktiv
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Willkommen zurück im VokabelTrainer!
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Du hast aktuell{' '}
            <span className="text-indigo-400 font-semibold">{stats.dueNowCount} Vokabeln</span> zur
            Wiederholung fällig. Starte eine Sitzung, um deinen Streak und dein Langzeitgedächtnis
            auszubauen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onStartTraining('TYPING')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            Fällige Vokabeln trainieren ({stats.dueNowCount})
          </button>
          <button
            onClick={onNavigateToVocabularies}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition"
          >
            <BookOpen className="w-4 h-4" />
            Vokabeln verwalten
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Level & XP */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Spieler-Level
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-white">Level {profile.level}</div>
            <div className="text-xs font-semibold text-amber-400">{profile.totalXp} XP</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Noch {Math.max(0, profile.xpForNextLevel - profile.totalXp)} XP bis Level{' '}
              {profile.level + 1}
            </p>
          </div>
        </div>

        {/* Daily Streak */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Lern-Streak
            </span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-white">{profile.currentStreak} Tage</div>
            <div className="text-xs text-slate-400">Rekord: {profile.longestStreak}d</div>
          </div>
          <p className="text-xs text-slate-400">
            Täglich mindestens eine Vokabel wiederholen, um die Serie zu halten.
          </p>
        </div>

        {/* Daily Goal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Tagesziel
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-white">
              {profile.reviewedTodayCount} / {profile.dailyGoalCards}
            </div>
            <div className="text-xs font-semibold text-emerald-400">{dailyProgress}%</div>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        {/* Accuracy & Total */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Trefferquote
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-bold text-white">{stats.overallAccuracy}%</div>
            <div className="text-xs text-slate-400">{stats.totalReviews} Abfragen</div>
          </div>
          <p className="text-xs text-slate-400">
            Gesamter Wortschatz: <strong className="text-slate-200">{stats.totalVocabularies}</strong>{' '}
            Einträge
          </p>
        </div>
      </div>

      {/* 6 Training Modes Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Trainingsmodus direkt starten
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickModes.map((m) => (
            <button
              key={m.mode}
              onClick={() => onStartTraining(m.mode)}
              className="group text-left bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition flex items-start gap-4"
            >
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${m.accent} text-white shadow-lg group-hover:scale-105 transition`}
              >
                {m.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                  {m.title}
                </div>
                <div className="text-xs text-slate-400 mt-1">{m.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mastery Distribution & Languages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery Progress */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white">Gedächtnis-Stufen (SM-2 Mastery)</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Neu / Ungelernt',
                count: masteryDistribution.newCount,
                color: 'bg-slate-500'
              },
              {
                label: 'Lernend (Intervall 1 Tag)',
                count: masteryDistribution.learningCount,
                color: 'bg-amber-500'
              },
              {
                label: 'Vertraut (2–6 Tage)',
                count: masteryDistribution.familiarCount,
                color: 'bg-sky-500'
              },
              {
                label: 'Gefestigt (1–3 Wochen)',
                count: masteryDistribution.confidentCount,
                color: 'bg-indigo-500'
              },
              {
                label: 'Gemeistert (> 21 Tage)',
                count: masteryDistribution.masteredCount,
                color: 'bg-emerald-500'
              }
            ].map((row) => {
              const pct =
                stats.totalVocabularies > 0
                  ? Math.round((row.count / stats.totalVocabularies) * 100)
                  : 0
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{row.label}</span>
                    <span className="text-slate-400 font-medium">
                      {row.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white">Sprachen im Wortschatz</h3>
          {stats.languageCounts.length === 0 ? (
            <p className="text-sm text-slate-400">
              Noch keine Vokabeln vorhanden. Lege neue Vokabeln an oder importiere eine Sammlung!
            </p>
          ) : (
            <div className="space-y-3">
              {stats.languageCounts.map((item) => (
                <div
                  key={item.language.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.language.flag}</span>
                    <div>
                      <div className="font-medium text-white">{item.language.name}</div>
                      <div className="text-xs text-slate-400">
                        {item.count} Vokabeln gesamt •{' '}
                        <span className="text-indigo-400">{item.dueCount} fällig</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onStartTraining('TYPING', item.language.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium border border-indigo-500/30 transition"
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
