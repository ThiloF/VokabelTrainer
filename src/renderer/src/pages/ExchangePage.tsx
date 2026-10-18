import React, { useEffect, useState } from 'react'
import { Download, Upload, FileCode, Eye, CheckCircle2 } from 'lucide-react'
import {
  CategoryDTO,
  ExchangeFormat,
  ImportResultDTO,
  LanguageDTO,
  SaveVocabularyInput
} from '@shared/dto'

interface ExchangePageProps {
  languages: LanguageDTO[]
  categories: CategoryDTO[]
  onDataChanged: () => void
}

export const ExchangePage: React.FC<ExchangePageProps> = ({
  languages,
  categories,
  onDataChanged
}) => {
  const [exportFormat, setExportFormat] = useState<ExchangeFormat>('JSON')
  const [includeProgress, setIncludeProgress] = useState(true)
  const [exportedOutput, setExportedOutput] = useState('')

  const [importFormat, setImportFormat] = useState<ExchangeFormat>('JSON')
  const [importContent, setImportContent] = useState('')
  const [sourceLangId, setSourceLangId] = useState('')
  const [targetLangId, setTargetLangId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [previewItems, setPreviewItems] = useState<SaveVocabularyInput[]>([])
  const [importResult, setImportResult] = useState<ImportResultDTO | null>(null)

  useEffect(() => {
    if (languages.length > 0 && !sourceLangId) {
      const en = languages.find((l) => l.code === 'en') ?? languages[0]
      const de = languages.find((l) => l.code === 'de') ?? languages[languages.length - 1]
      setSourceLangId(en.id)
      setTargetLangId(de.id)
    }
  }, [languages])

  const handleExport = async () => {
    const content = await window.electronAPI.exportVocabularies({
      format: exportFormat,
      includeProgress
    })
    setExportedOutput(content)
  }

  const handleDownloadExport = () => {
    if (!exportedOutput) return
    const ext = exportFormat.toLowerCase()
    const blob = new Blob([exportedOutput], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vokabel-sammlung.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.name.endsWith('.xml')) setImportFormat('XML')
    else if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt'))
      setImportFormat('CSV')
    else if (file.name.endsWith('.json')) setImportFormat('JSON')

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportContent(reader.result)
      }
    }
    reader.readAsText(file)
  }

  const handlePreview = async () => {
    if (!importContent.trim()) return
    const list = await window.electronAPI.previewImport({
      format: importFormat,
      content: importContent,
      defaultSourceLanguageId: sourceLangId,
      defaultTargetLanguageId: targetLangId,
      defaultCategoryId: categoryId || null
    })
    setPreviewItems(list)
  }

  const handleExecuteImport = async () => {
    if (!importContent.trim()) return
    const res = await window.electronAPI.importVocabularies({
      format: importFormat,
      content: importContent,
      defaultSourceLanguageId: sourceLangId,
      defaultTargetLanguageId: targetLangId,
      defaultCategoryId: categoryId || null
    })
    setImportResult(res)
    setPreviewItems([])
    onDataChanged()
  }

  const loadSampleTemplate = (fmt: ExchangeFormat) => {
    setImportFormat(fmt)
    if (fmt === 'JSON') {
      setImportContent(
        JSON.stringify(
          {
            vocabularies: [
              {
                sourceText: 'ephemeral',
                targetTexts: ['flüchtig', 'kurzlebig'],
                partOfSpeech: 'adjective',
                phonetic: '/ɪˈfɛmərəl/',
                tags: ['B2-C1', 'Literatur'],
                examples: [
                  {
                    sentence: 'Fame in the digital age is often ephemeral.',
                    translation: 'Ruhm im digitalen Zeitalter ist oft flüchtig.'
                  }
                ]
              }
            ]
          },
          null,
          2
        )
      )
    } else if (fmt === 'XML') {
      setImportContent(`<?xml version="1.0" encoding="UTF-8"?>
<vocabularyCollection>
  <vocabulary>
    <sourceText>relentless</sourceText>
    <targets>
      <target>unerbittlich</target>
      <target>unaufhörlich</target>
    </targets>
    <partOfSpeech>adjective</partOfSpeech>
    <tags>
      <tag>B2-C1</tag>
    </tags>
  </vocabulary>
</vocabularyCollection>`)
    } else {
      setImportContent(
        `sourceText,targetTexts,partOfSpeech,tags,exampleSentence\nendeavor,Bemühung; Bestreben,noun,Business; C1,Every scientific endeavor requires patience.`
      )
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Import & Export Center</h1>
        <p className="text-sm text-slate-400">
          Importiere und exportiere Vokabelsammlungen über JSON, XML oder CSV/TSV (inkl.
          Anki-Deck-Kompatibilität).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* IMPORT PANEL */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Vokabelsammlung importieren
            </h2>
            <div className="flex gap-1.5">
              {(['JSON', 'XML', 'CSV'] as ExchangeFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => loadSampleTemplate(fmt)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {fmt}-Beispiel laden
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Format</label>
              <select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value as ExchangeFormat)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="JSON">JSON</option>
                <option value="XML">XML</option>
                <option value="CSV">CSV / TSV (Anki)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Quellsprache</label>
              <select
                value={sourceLangId}
                onChange={(e) => setSourceLangId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Zielsprache</label>
              <select
                value={targetLangId}
                onChange={(e) => setTargetLangId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Kategorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="">— Optional —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Datei auswählen (.json, .xml, .csv, .tsv) oder Inhalt unten einfügen
            </label>
            <input
              type="file"
              accept=".json,.xml,.csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
            />
          </div>

          <textarea
            rows={9}
            value={importContent}
            onChange={(e) => setImportContent(e.target.value)}
            placeholder="JSON-, XML- oder CSV-Daten hier einfügen..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          />

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              <Eye className="w-4 h-4" /> Vorschau prüfen
            </button>
            <button
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg"
            >
              <Upload className="w-4 h-4" /> Jetzt importieren
            </button>
          </div>

          {previewItems.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-indigo-300">
                Vorschau: {previewItems.length} Vokabel(n) erkannt
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-slate-300">
                {previewItems.map((it, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-900 py-1">
                    <span className="font-semibold">{it.sourceText}</span>
                    <span className="text-slate-400">{it.targetTexts.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResult && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Import abgeschlossen: <strong>{importResult.importedCount}</strong> importiert,{' '}
                {importResult.skippedCount} übersprungen.
              </span>
            </div>
          )}
        </div>

        {/* EXPORT PANEL */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Vokabelsammlung exportieren
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Export-Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExchangeFormat)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="JSON">JSON (Komplett)</option>
                <option value="XML">XML (Strukturiert)</option>
                <option value="CSV">CSV (Tabellen / Anki)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={includeProgress}
                onChange={(e) => setIncludeProgress(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950"
              />
              Lernstand (SM-2 Intervalle & Scores) einschließen
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg"
            >
              <FileCode className="w-4 h-4" /> Export generieren
            </button>
            {exportedOutput && (
              <button
                onClick={handleDownloadExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                <Download className="w-4 h-4" /> Als Datei speichern (.{exportFormat.toLowerCase()})
              </button>
            )}
          </div>

          <textarea
            rows={13}
            readOnly
            value={exportedOutput}
            placeholder="Klicke auf 'Export generieren', um den JSON-, XML- oder CSV-Output anzuzeigen..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300"
          />
        </div>
      </div>
    </div>
  )
}
