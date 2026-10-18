import React, { useState } from 'react'
import { Globe, Folder, Tag as TagIcon, Key, Check, Plus, Trash2 } from 'lucide-react'
import { CategoryDTO, LanguageDTO, TagDTO, UserProfileDTO } from '@shared/dto'

interface SettingsPageProps {
  profile: UserProfileDTO | null
  languages: LanguageDTO[]
  categories: CategoryDTO[]
  tags: TagDTO[]
  onDataChanged: () => void
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  languages,
  categories,
  tags,
  onDataChanged
}) => {
  const [dailyGoal, setDailyGoal] = useState(profile?.dailyGoalCards ?? 20)
  const [typoTolerance, setTypoTolerance] = useState(profile?.typoToleranceEnabled ?? true)
  const [deeplKey, setDeeplKey] = useState(profile?.deeplApiKey ?? '')
  const [googleKey, setGoogleKey] = useState(profile?.googleTranslateApiKey ?? '')
  const [savedNotice, setSavedNotice] = useState(false)

  // New language state
  const [langCode, setLangCode] = useState('')
  const [langLocale, setLangLocale] = useState('')
  const [langName, setLangName] = useState('')
  const [langFlag, setLangFlag] = useState('🌐')

  // New category state
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')

  // New tag state
  const [tagName, setTagName] = useState('')

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.updateProfile({
      dailyGoalCards: Number(dailyGoal) || 20,
      typoToleranceEnabled: typoTolerance,
      deeplApiKey: deeplKey.trim() || null,
      googleTranslateApiKey: googleKey.trim() || null
    })
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
    onDataChanged()
  }

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!langCode.trim() || !langName.trim()) return
    await window.electronAPI.saveLanguage({
      code: langCode.trim(),
      locale: langLocale.trim() || `${langCode.trim()}-${langCode.trim().toUpperCase()}`,
      name: langName.trim(),
      flag: langFlag || '🌐'
    })
    setLangCode('')
    setLangLocale('')
    setLangName('')
    onDataChanged()
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return
    await window.electronAPI.saveCategory({
      name: catName.trim(),
      description: catDesc.trim() || null
    })
    setCatName('')
    setCatDesc('')
    onDataChanged()
  }

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return
    await window.electronAPI.saveTag({ name: tagName.trim() })
    setTagName('')
    onDataChanged()
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Einstellungen & Stammdaten</h1>
        <p className="text-sm text-stone-600">
          Konfiguriere Sprachen, Kategorien, Tags, Lernziele und optionale API-Schlüssel für DeepL /
          Google Cloud Translate.
        </p>
      </div>

      {/* API Keys & Learning Preferences */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-amber-900/15 rounded-2xl p-6 space-y-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-700" />
          Übersetzungs-APIs & Trainings-Optionen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              DeepL API-Key (optional — Standard nutzt kostenlose Dictionary & Google GTX API)
            </label>
            <input
              type="password"
              value={deeplKey}
              onChange={(e) => setDeeplKey(e.target.value)}
              placeholder="z.B. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
              className="w-full px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Google Cloud Translation API-Key (optional)
            </label>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Tägliches Lernziel (Karten pro Tag)
            </label>
            <input
              type="number"
              min={5}
              max={500}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-[#FDF8F2] border border-amber-900/20 rounded-xl text-sm text-stone-900"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2.5 text-sm font-medium text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={typoTolerance}
                onChange={(e) => setTypoTolerance(e.target.checked)}
                className="rounded border-amber-900/30"
              />
              Levenshtein Tippfehler-Toleranz (1 Buchstabe Abweichung = „Fast richtig“)
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white text-sm font-semibold shadow-sm transition"
          >
            Einstellungen speichern
          </button>
          {savedNotice && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check className="w-4 h-4" /> Gespeichert!
            </span>
          )}
        </div>
      </form>

      {/* Languages, Categories, Tags Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Languages */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-700" /> Sprachen ({languages.length})
          </h3>
          <form onSubmit={handleAddLanguage} className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="ISO (z.B. pt)"
                value={langCode}
                onChange={(e) => setLangCode(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
              />
              <input
                type="text"
                placeholder="pt-BR"
                value={langLocale}
                onChange={(e) => setLangLocale(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
              />
              <input
                type="text"
                placeholder="Flagge 🇵🇹"
                value={langFlag}
                onChange={(e) => setLangFlag(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name (z.B. Portugiesisch)"
                value={langName}
                onChange={(e) => setLangName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {languages.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FDF8F2] border border-amber-900/15 text-xs text-stone-800"
              >
                <span>
                  {l.flag} <strong>{l.name}</strong>{' '}
                  <span className="text-stone-500">({l.locale})</span>
                </span>
                <button
                  onClick={async () => {
                    await window.electronAPI.deleteLanguage(l.id)
                    onDataChanged()
                  }}
                  className="text-stone-400 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <Folder className="w-4 h-4 text-orange-700" /> Kategorien ({categories.length})
          </h3>
          <form onSubmit={handleAddCategory} className="space-y-2">
            <input
              type="text"
              placeholder="Neue Kategorie..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Kurzbeschreibung (optional)"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FDF8F2] border border-amber-900/15 text-xs text-stone-800"
              >
                <span>
                  <strong>{c.name}</strong>{' '}
                  <span className="text-stone-500">({c.vocabularyCount ?? 0})</span>
                </span>
                <button
                  onClick={async () => {
                    await window.electronAPI.deleteCategory(c.id)
                    onDataChanged()
                  }}
                  className="text-stone-400 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white border border-amber-900/15 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-emerald-700" /> Tags ({tags.length})
          </h3>
          <form onSubmit={handleAddTag} className="flex gap-2">
            <input
              type="text"
              placeholder="Neuer Tag (z.B. Grammatik)..."
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-[#FDF8F2] border border-amber-900/20 rounded-lg text-xs text-stone-900"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FDF8F2] border border-amber-900/15 text-xs text-stone-800"
              >
                <span>
                  #{t.name} <span className="text-stone-500">({t.vocabularyCount ?? 0})</span>
                </span>
                <button
                  onClick={async () => {
                    await window.electronAPI.deleteTag(t.id)
                    onDataChanged()
                  }}
                  className="text-stone-400 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
