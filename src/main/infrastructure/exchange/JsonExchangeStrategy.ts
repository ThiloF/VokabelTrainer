import { injectable } from 'tsyringe'
import { IExchangeStrategy } from '@main/domain/repositories'
import { ExchangeFormat, SaveVocabularyInput, VocabularyDTO } from '@shared/dto'

@injectable()
export class JsonExchangeStrategy implements IExchangeStrategy {
  public readonly format: ExchangeFormat = 'JSON'

  public serialize(vocabularies: VocabularyDTO[], includeProgress = false): string {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: vocabularies.length,
      vocabularies: vocabularies.map((v) => ({
        sourceText: v.sourceText,
        targetTexts: v.targetTexts,
        partOfSpeech: v.partOfSpeech ?? undefined,
        phonetic: v.phonetic ?? undefined,
        notes: v.notes ?? undefined,
        difficulty: v.difficulty,
        sourceLanguageCode: v.sourceLanguage?.code,
        targetLanguageCode: v.targetLanguage?.code,
        categoryName: v.category?.name ?? undefined,
        tags: v.tags.map((t) => t.name),
        examples: v.examples.map((ex) => ({
          sentence: ex.sentence,
          translation: ex.translation ?? undefined,
          clozeWord: ex.clozeWord ?? undefined
        })),
        ...(includeProgress && v.progress ? { progress: v.progress } : {})
      }))
    }
    return JSON.stringify(payload, null, 2)
  }

  public parse(
    content: string,
    defaults: {
      sourceLanguageId: string
      targetLanguageId: string
      categoryId?: string | null
    }
  ): SaveVocabularyInput[] {
    const parsed = JSON.parse(content)
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.vocabularies)
        ? parsed.vocabularies
        : []

    const results: SaveVocabularyInput[] = []
    for (const item of list) {
      const sourceText = String(item.sourceText ?? item.word ?? item.front ?? '').trim()
      const rawTargets = item.targetTexts ?? item.translations ?? item.target ?? item.back
      const targetTexts: string[] = Array.isArray(rawTargets)
        ? rawTargets.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof rawTargets === 'string'
          ? rawTargets
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []

      if (!sourceText || targetTexts.length === 0) continue

      const tagNames: string[] = Array.isArray(item.tags)
        ? item.tags.map((t: any) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
        : []

      const examples = Array.isArray(item.examples)
        ? item.examples
            .map((ex: any) => ({
              sentence: String(ex.sentence ?? '').trim(),
              translation: ex.translation ? String(ex.translation).trim() : null,
              clozeWord: ex.clozeWord ? String(ex.clozeWord).trim() : sourceText
            }))
            .filter((ex: any) => ex.sentence.length > 0)
        : []

      results.push({
        sourceText,
        targetTexts,
        partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech) : undefined,
        phonetic: item.phonetic ? String(item.phonetic) : undefined,
        notes: item.notes ? String(item.notes) : undefined,
        difficulty: Number(item.difficulty) || 1,
        sourceLanguageId: defaults.sourceLanguageId,
        targetLanguageId: defaults.targetLanguageId,
        categoryId: defaults.categoryId ?? null,
        tagNames,
        examples
      })
    }

    return results
  }
}
