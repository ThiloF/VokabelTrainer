import { injectable } from 'tsyringe'
import { IAudioProvider } from '@main/domain/repositories'

@injectable()
export class GoogleTtsAudioAdapter implements IAudioProvider {
  /**
   * Fetches spoken pronunciation audio from Google Translate TTS and returns a base64 Data URI
   * so it can be played offline and without CORS issues in Electron Renderer.
   */
  public async fetchPronunciationUrl(text: string, langCode: string): Promise<string | null> {
    const cleanText = text.trim()
    if (!cleanText) return null

    const tl = langCode.split('-')[0].toLowerCase()
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(tl)}&client=tw-ob`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        signal: AbortSignal.timeout(6000)
      })

      if (!response.ok) return null
      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength === 0) return null

      const base64 = Buffer.from(arrayBuffer).toString('base64')
      return `data:audio/mpeg;base64,${base64}`
    } catch {
      return null
    }
  }
}
