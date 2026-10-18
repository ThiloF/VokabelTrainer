import { injectable } from 'tsyringe'
import Papa from 'papaparse'
import { IExchangeStrategy } from '@main/domain/repositories'
import { ExchangeFormat, SaveVocabularyInput, VocabularyDTO } from '@shared/dto'

@injectable()
export class CsvExchangeStrategy implements IExchangeStrategy {
  public readonly format: ExchangeFormat = 'CSV'

  public serialize(vocabularies: VocabularyDTO[]): string {
    const rows = vocabularies.map((v) => ({
      sourceText: v.sourceText,
      targetTexts: v.targetTexts.join('; '),
      partOfSpeech: v.partOfSpeech ?? '',
      phonetic: v.phonetic ?? '',
      notes: v.notes ?? '',
      tags: v.tags.map((t) => t.name).join('; '),
      exampleSentence: v.examples[0]?.sentence ?? '',
      exampleTranslation: v.examples[0]?.translation ?? ''
    }))

    return Papa.unparse(rows, {
      header: true,
      delimiter: ','
    })
  }

  public parse(
    content: string,
    defaults: {
      sourceLanguageId: string
      targetLanguageId: string
      categoryId?: string | null
    }
  ): SaveVocabularyInput[] {
    const trimmed = content.trim()
    if (!trimmed) return []

    // Support both CSV with headers and headerless Anki TSV/CSV decks
    const firstLine = trimmed.split(/\r?\n/)[0] ?? ''
    const hasHeader =
      /sourceText|word|front|vokabel/i.test(firstLine) &&
      /targetTexts|translation|back|bedeutung/i.test(firstLine)

    if (hasHeader) {
      const parsed = Papa.parse<Record<string, string>>(trimmed, {
        header: true,
        skipEmptyLines: true
      })

      const results: SaveVocabularyInput[] = []
      for (const row of parsed.data) {
        const sourceText = String(
          row.sourceText ?? row.word ?? row.front ?? row.Vokabel ?? ''
        ).trim()
        const rawTarget = String(
          row.targetTexts ?? row.translation ?? row.back ?? row.Bedeutung ?? ''
        ).trim()

        if (!sourceText || !rawTarget) continue

        const targetTexts = rawTarget
          .split(/[;|]/)
          .map((s) => s.trim())
          .filter(Boolean)

        const rawTags = String(row.tags ?? row.Tags ?? '').trim()
        const tagNames = rawTags
          ? rawTags
              .split(/[;,]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : []

        const exampleSentence = String(row.exampleSentence ?? row.example ?? '').trim()
        const exampleTranslation = String(row.exampleTranslation ?? '').trim()

        results.push({
          sourceText,
          targetTexts,
          partOfSpeech: row.partOfSpeech?.trim() || undefined,
          phonetic: row.phonetic?.trim() || undefined,
          notes: row.notes?.trim() || undefined,
          sourceLanguageId: defaults.sourceLanguageId,
          targetLanguageId: defaults.targetLanguageId,
          categoryId: defaults.categoryId ?? null,
          tagNames,
          examples: exampleSentence
            ? [
                {
                  sentence: exampleSentence,
                  translation: exampleTranslation || null,
                  clozeWord: sourceText
                }
              ]
            : []
        })
      }
      return results
    }

    // Headerless CSV/TSV (e.g. Anki format: Front \t Back \t Tags)
    const parsedRows = Papa.parse<string[]>(trimmed, {
      header: false,
      skipEmptyLines: true
    })

    const results: SaveVocabularyInput[] = []
    for (const cols of parsedRows.data) {
      if (!Array.isArray(cols) || cols.length < 2) continue
      const sourceText = String(cols[0] ?? '').trim()
      if (sourceText.startsWith('#')) continue // Skip Anki comments
      const rawTarget = String(cols[1] ?? '').trim()
      if (!sourceText || !rawTarget) continue

      const targetTexts = rawTarget
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean)

      const tagNames = cols[2]
        ? String(cols[2])
            .split(/[;,\s]+/)
            .map((t) => t.trim())
            .filter(Boolean)
        : []

      results.push({
        sourceText,
        targetTexts,
        sourceLanguageId: defaults.sourceLanguageId,
        targetLanguageId: defaults.targetLanguageId,
        categoryId: defaults.categoryId ?? null,
        tagNames
      })
    }

    return results
  }
}
