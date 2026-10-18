import { injectable } from 'tsyringe'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { IExchangeStrategy } from '@main/domain/repositories'
import { ExchangeFormat, SaveVocabularyInput, VocabularyDTO } from '@shared/dto'

@injectable()
export class XmlExchangeStrategy implements IExchangeStrategy {
  public readonly format: ExchangeFormat = 'XML'

  public serialize(vocabularies: VocabularyDTO[], includeProgress = false): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: '  '
    })

    const xmlObject = {
      '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
      vocabularyCollection: {
        '@_version': '1.0',
        '@_exportedAt': new Date().toISOString(),
        vocabulary: vocabularies.map((v) => ({
          sourceText: v.sourceText,
          targets: {
            target: v.targetTexts
          },
          partOfSpeech: v.partOfSpeech ?? '',
          phonetic: v.phonetic ?? '',
          notes: v.notes ?? '',
          difficulty: v.difficulty,
          category: v.category?.name ?? '',
          tags: {
            tag: v.tags.map((t) => t.name)
          },
          examples: {
            example: v.examples.map((ex) => ({
              sentence: ex.sentence,
              translation: ex.translation ?? '',
              clozeWord: ex.clozeWord ?? v.sourceText
            }))
          },
          ...(includeProgress && v.progress
            ? {
                progress: {
                  easeFactor: v.progress.easeFactor,
                  intervalDays: v.progress.intervalDays,
                  repetitions: v.progress.repetitions,
                  masteryLevel: v.progress.masteryLevel
                }
              }
            : {})
        }))
      }
    }

    return builder.build(xmlObject)
  }

  public parse(
    content: string,
    defaults: {
      sourceLanguageId: string
      targetLanguageId: string
      categoryId?: string | null
    }
  ): SaveVocabularyInput[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      isArray: (name) => ['vocabulary', 'target', 'tag', 'example'].includes(name)
    })

    const parsed = parser.parse(content)
    const root = parsed?.vocabularyCollection ?? parsed?.vocabularies ?? parsed
    const rawList = root?.vocabulary ?? root?.item ?? []
    const list = Array.isArray(rawList) ? rawList : [rawList]

    const results: SaveVocabularyInput[] = []

    for (const item of list) {
      if (!item) continue
      const sourceText = String(item.sourceText ?? item.word ?? item.front ?? '').trim()

      let targetTexts: string[] = []
      if (item.targets?.target) {
        const tArr = Array.isArray(item.targets.target)
          ? item.targets.target
          : [item.targets.target]
        targetTexts = tArr.map((t: any) => String(t).trim()).filter(Boolean)
      } else if (item.targetText || item.back) {
        targetTexts = String(item.targetText ?? item.back)
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      }

      if (!sourceText || targetTexts.length === 0) continue

      const rawTags = item.tags?.tag ?? []
      const tagNames = (Array.isArray(rawTags) ? rawTags : [rawTags])
        .map((t: any) => String(t).trim())
        .filter(Boolean)

      const rawExamples = item.examples?.example ?? []
      const examples = (Array.isArray(rawExamples) ? rawExamples : [rawExamples])
        .filter((ex: any) => ex && ex.sentence)
        .map((ex: any) => ({
          sentence: String(ex.sentence).trim(),
          translation: ex.translation ? String(ex.translation).trim() : null,
          clozeWord: ex.clozeWord ? String(ex.clozeWord).trim() : sourceText
        }))

      results.push({
        sourceText,
        targetTexts,
        partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech).trim() : undefined,
        phonetic: item.phonetic ? String(item.phonetic).trim() : undefined,
        notes: item.notes ? String(item.notes).trim() : undefined,
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
