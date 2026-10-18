import React, { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  ArrowLeftRight,
  Settings,
  Database,
  Flame,
  Trophy,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import {
  CategoryDTO,
  DashboardStatsDTO,
  LanguageDTO,
  TagDTO,
  TrainingMode
} from '@shared/dto'
import { DashboardPage } from './pages/DashboardPage'
import { VocabularyPage } from './pages/VocabularyPage'
import { TrainerPage } from './pages/TrainerPage'
import { ExchangePage } from './pages/ExchangePage'
import { SettingsPage } from './pages/SettingsPage'

type ActiveTab = 'DASHBOARD' | 'TRAINER' | 'VOCABULARIES' | 'EXCHANGE' | 'SETTINGS'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD')
  const [trainerMode, setTrainerMode] = useState<TrainingMode>('TYPING')
  const [trainerLanguageId, setTrainerLanguageId] = useState<string | undefined>(undefined)

  const [dbConnected, setDbConnected] = useState<boolean>(true)
  const [dbError, setDbError] = useState<string | undefined>(undefined)

  const [stats, setStats] = useState<DashboardStatsDTO | null>(null)
  const [languages, setLanguages] = useState<LanguageDTO[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [tags, setTags] = useState<TagDTO[]>([])

  const refreshAllData = useCallback(async () => {
    try {
      const conn = await window.electronAPI.checkDbConnection()
      setDbConnected(conn.connected)
      setDbError(conn.error)

      const [dashStats, langs, cats, tagList] = await Promise.all([
        window.electronAPI.getDashboardStats(),
        window.electronAPI.getLanguages(),
        window.electronAPI.getCategories(),
        window.electronAPI.getTags()
      ])

      setStats(dashStats)
      setLanguages(langs)
      setCategories(cats)
      setTags(tagList)
    } catch (err: any) {
      setDbConnected(false)
      setDbError(err?.message ?? 'Verbindungsfehler zur PostgreSQL Datenbank.')
    }
  }, [])

  useEffect(() => {
    refreshAllData()
  }, [refreshAllData])

  const handleStartTraining = (mode: TrainingMode, sourceLanguageId?: string) => {
    setTrainerMode(mode)
    setTrainerLanguageId(sourceLanguageId)
    setActiveTab('TRAINER')
  }

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'TRAINER', label: 'Training & Abfrage', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'VOCABULARIES', label: 'Vokabel-Manager', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'EXCHANGE', label: 'Import / Export', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'SETTINGS', label: 'Einstellungen', icon: <Settings className="w-4 h-4" /> }
  ]

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-5 space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
              VT
            </div>
            <div>
              <div className="font-bold text-white leading-tight">VokabelTrainer</div>
              <div className="text-[11px] text-slate-400">Modular DDD Studio</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User Gamification Footer & DB Status */}
        <div className="p-4 space-y-3 border-t border-slate-800/80">
          {stats?.profile && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                  <Trophy className="w-3.5 h-3.5" /> Lvl {stats.profile.level}
                </span>
                <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                  <Flame className="w-3.5 h-3.5" /> {stats.profile.currentStreak}d Streak
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Gesamt-Score: <strong className="text-slate-200">{stats.profile.totalXp} XP</strong>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Datenbank
            </span>
            <span
              title={
                dbConnected
                  ? 'Verbunden mit PostgreSQL'
                  : `Lokaler Fallback-Speicher aktiv (${dbError ?? 'PostgreSQL offline'})`
              }
              className={`inline-flex items-center gap-1 font-medium ${
                dbConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {dbConnected ? 'PostgreSQL' : 'Lokal (Fallback)'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'DASHBOARD' && (
          <DashboardPage
            stats={stats}
            onStartTraining={handleStartTraining}
            onNavigateToVocabularies={() => setActiveTab('VOCABULARIES')}
          />
        )}
        {activeTab === 'TRAINER' && (
          <TrainerPage
            initialMode={trainerMode}
            initialLanguageId={trainerLanguageId}
            languages={languages}
            categories={categories}
            tags={tags}
            onSessionCompleted={refreshAllData}
          />
        )}
        {activeTab === 'VOCABULARIES' && (
          <VocabularyPage
            languages={languages}
            categories={categories}
            tags={tags}
            onDataChanged={refreshAllData}
          />
        )}
        {activeTab === 'EXCHANGE' && (
          <ExchangePage
            languages={languages}
            categories={categories}
            onDataChanged={refreshAllData}
          />
        )}
        {activeTab === 'SETTINGS' && (
          <SettingsPage
            profile={stats?.profile ?? null}
            languages={languages}
            categories={categories}
            tags={tags}
            onDataChanged={refreshAllData}
          />
        )}
      </main>
    </div>
  )
}
