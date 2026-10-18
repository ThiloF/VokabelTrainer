import { injectable } from 'tsyringe'
import { IDictionaryProvider } from '@main/domain/repositories'
import { EnrichmentResultDTO, ExampleSentenceDTO } from '@shared/dto'

@injectable()
export class FreeDictionaryAdapter implements IDictionaryProvider {
  /**
   * Queries https://api.dictionaryapi.dev/api/v2/entries/{lang}/{word}
   * Extracts IPA phonetic, audio URL, part of speech, definitions, and example sentences.
   */
  public async lookupWord(
    word: string,
    langCode: string
  ): Promise<Partial<EnrichmentResultDTO> | null> {
    const cleanWord = word.trim()
    if (!cleanWord) return null

    const shortLang = langCode.split('-')[0].toLowerCase()
    const url = `https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(shortLang)}/${encodeURIComponent(cleanWord)}`

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      })
      if (!response.ok) return null

      const data = await response.json()
      if (!Array.isArray(data) || data.length === 0) return null

      const entry = data[0]
      let phonetic: string | undefined = entry.phonetic
      let audioUrl: string | undefined

      if (Array.isArray(entry.phonetics)) {
        for (const p of entry.phonetics) {
          if (!phonetic && p.text) phonetic = p.text
          if (!audioUrl && p.audio && typeof p.audio === 'string' && p.audio.trim().length > 0) {
            audioUrl = p.audio.startsWith('//') ? `https:${p.audio}` : p.audio
          }
        }
      }

      let partOfSpeech: string | undefined
      const definitions: string[] = []
      const examples: ExampleSentenceDTO[] = []

      if (Array.isArray(entry.meanings)) {
        for (const meaning of entry.meanings) {
          if (!partOfSpeech && meaning.partOfSpeech) {
            partOfSpeech = meaning.partOfSpeech
          }
          if (Array.isArray(meaning.definitions)) {
            for (const def of meaning.definitions) {
              if (def.definition && definitions.length < 4) {
                definitions.push(def.definition)
              }
              if (def.example && examples.length < 3) {
                examples.push({
                  sentence: def.example,
                  clozeWord: cleanWord
                })
              }
            }
          }
        }
      }

      return {
        word: cleanWord,
        phonetic,
        partOfSpeech,
        audioUrl,
        definitions,
        examples
      }
    } catch {
      return null
    }
  }
}
