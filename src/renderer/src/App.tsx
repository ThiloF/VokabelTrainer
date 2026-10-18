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
  Leaf
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
    <div className="min-h-screen flex bg-[#FDF8F2] text-stone-800">
      {/* Sidebar in warm parchment / autumn style */}
      <aside className="w-64 bg-[#F4EBE1] border-r border-amber-900/15 flex flex-col justify-between shrink-0 shadow-sm">
        <div className="p-5 space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700 via-orange-700 to-amber-900 flex items-center justify-center text-amber-50 font-bold shadow-md shadow-amber-900/20">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-stone-900 leading-tight">VokabelTrainer</div>
              <div className="text-[11px] text-amber-900/70 font-medium">Autumn Studio Edition</div>
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-md shadow-amber-800/20'
                      : 'text-stone-700 hover:text-amber-950 hover:bg-amber-900/10'
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
        <div className="p-4 space-y-3 border-t border-amber-900/15">
          {stats?.profile && (
            <div className="p-3.5 rounded-xl bg-[#FDF8F2] border border-amber-900/15 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" /> Lvl {stats.profile.level}
                </span>
                <span className="inline-flex items-center gap-1 text-orange-700 font-bold">
                  <Flame className="w-3.5 h-3.5 text-orange-600" /> {stats.profile.currentStreak}d Streak
                </span>
              </div>
              <div className="text-[11px] text-stone-600">
                Gesamt-Score: <strong className="text-stone-900">{stats.profile.totalXp} XP</strong>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-2 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-amber-800" />
              Speicher
            </span>
            <span
              title={
                dbConnected
                  ? 'Verbunden mit PostgreSQL'
                  : `Lokaler Fallback-Speicher aktiv (${dbError ?? 'PostgreSQL offline'})`
              }
              className={`inline-flex items-center gap-1 font-semibold ${
                dbConnected ? 'text-emerald-700' : 'text-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbConnected ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
              {dbConnected ? 'PostgreSQL' : 'Lokal aktiv'}
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
