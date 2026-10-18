import { injectable } from 'tsyringe'
import { ITranslationProvider } from '@main/domain/repositories'
import { EnrichmentRequestDTO } from '@shared/dto'

@injectable()
export class MultiTranslationAdapter implements ITranslationProvider {
  public async translate(
    req: EnrichmentRequestDTO,
    credentials?: { deeplApiKey?: string | null; googleTranslateApiKey?: string | null }
  ): Promise<{ translations: string[]; providerUsed: string }> {
    const text = req.word.trim()
    if (!text) return { translations: [], providerUsed: 'None' }

    const src = req.sourceLangCode.split('-')[0].toLowerCase()
    const tgt = req.targetLangCode.split('-')[0].toLowerCase()

    // 1. Try DeepL API if key is configured
    const deeplKey = credentials?.deeplApiKey?.trim() || process.env.DEEPL_API_KEY?.trim()
    if (deeplKey) {
      const deeplRes = await this.tryDeepL(text, src, tgt, deeplKey)
      if (deeplRes.length > 0) {
        return { translations: deeplRes, providerUsed: 'DeepL API' }
      }
    }

    // 2. Try Official Google Cloud Translation API if key is configured
    const googleKey =
      credentials?.googleTranslateApiKey?.trim() || process.env.GOOGLE_TRANSLATE_API_KEY?.trim()
    if (googleKey) {
      const gCloudRes = await this.tryGoogleCloudTranslate(text, src, tgt, googleKey)
      if (gCloudRes.length > 0) {
        return { translations: gCloudRes, providerUsed: 'Google Cloud Translate' }
      }
    }

    // 3. Try Free Google Translate GTX endpoint (includes dictionary synonyms!)
    const gtxRes = await this.tryGooglePublicGtx(text, src, tgt)
    if (gtxRes.length > 0) {
      return { translations: gtxRes, providerUsed: 'Google Translate (Free)' }
    }

    // 4. Fallback to MyMemory Translation API
    const myMemoryRes = await this.tryMyMemory(text, src, tgt)
    if (myMemoryRes.length > 0) {
      return { translations: myMemoryRes, providerUsed: 'MyMemory API' }
    }

    return { translations: [], providerUsed: 'Offline' }
  }

  private async tryDeepL(
    text: string,
    src: string,
    tgt: string,
    apiKey: string
  ): Promise<string[]> {
    try {
      const isFree = apiKey.endsWith(':fx')
      const host = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
      const res = await fetch(`${host}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: [text],
          source_lang: src.toUpperCase(),
          target_lang: tgt.toUpperCase()
        }),
        signal: AbortSignal.timeout(6000)
      })
      if (!res.ok) return []
      const data = await res.json()
      if (Array.isArray(data?.translations)) {
        return data.translations.map((t: any) => t.text).filter(Boolean)
      }
      return []
    } catch {
      return []
    }
  }

  private async tryGoogleCloudTranslate(
    text: string,
    src: string,
    tgt: string,
    apiKey: string
  ): Promise<string[]> {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: src,
          target: tgt,
          format: 'text'
        }),
        signal: AbortSignal.timeout(6000)
      })
      if (!res.ok) return []
      const data = await res.json()
      const list = data?.data?.translations
      if (Array.isArray(list)) {
        return list.map((t: any) => t.translatedText).filter(Boolean)
      }
      return []
    } catch {
      return []
    }
  }

  private async tryGooglePublicGtx(text: string, src: string, tgt: string): Promise<string[]> {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(tgt)}&dt=t&dt=bd&q=${encodeURIComponent(text)}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000)
      })
      if (!res.ok) return []
      const data = await res.json()
      const results = new Set<string>()

      // Primary translation
      if (Array.isArray(data?.[0])) {
        const primary = data[0].map((part: any) => part?.[0]).filter(Boolean).join('')
        if (primary) results.add(primary.trim())
      }

      // Dictionary synonyms (dt=bd)
      if (Array.isArray(data?.[1])) {
        for (const posBlock of data[1]) {
          if (Array.isArray(posBlock?.[1])) {
            for (const word of posBlock[1].slice(0, 4)) {
              if (typeof word === 'string' && word.trim()) {
                results.add(word.trim())
              }
            }
          }
        }
      }

      return Array.from(results).slice(0, 5)
    } catch {
      return []
    }
  }

  private async tryMyMemory(text: string, src: string, tgt: string): Promise<string[]> {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(tgt)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) return []
      const data = await res.json()
      const results = new Set<string>()
      if (data?.responseData?.translatedText) {
        results.add(data.responseData.translatedText.trim())
      }
      if (Array.isArray(data?.matches)) {
        for (const m of data.matches.slice(0, 3)) {
          if (m.translation && typeof m.translation === 'string') {
            results.add(m.translation.trim())
          }
        }
      }
      return Array.from(results).slice(0, 4)
    } catch {
      return []
    }
  }
}
