import { useCallback, useState } from 'react'

export function usePronunciation() {
  const [isPlaying, setIsPlaying] = useState(false)

  const speak = useCallback(
    async (text: string, langLocale = 'en-US', existingAudioUrl?: string | null) => {
      if (!text.trim()) return
      setIsPlaying(true)

      const finish = () => setIsPlaying(false)

      try {
        // 1. Play existing Audio URL or Data URI if present
        if (existingAudioUrl && existingAudioUrl.trim().length > 0) {
          const audio = new Audio(existingAudioUrl)
          audio.onended = finish
          audio.onerror = () => fallbackToTts(text, langLocale, finish)
          await audio.play()
          return
        }

        // 2. Fetch Google Translate TTS audio via Main Process
        const dataUri = await window.electronAPI.fetchTtsAudio(text, langLocale)
        if (dataUri) {
          const audio = new Audio(dataUri)
          audio.onended = finish
          audio.onerror = () => fallbackToWebSpeech(text, langLocale, finish)
          await audio.play()
          return
        }

        // 3. Fallback to Browser Web Speech API
        fallbackToWebSpeech(text, langLocale, finish)
      } catch {
        fallbackToWebSpeech(text, langLocale, finish)
      }
    },
    []
  )

  return { speak, isPlaying }
}

async function fallbackToTts(text: string, langLocale: string, onDone: () => void) {
  try {
    const dataUri = await window.electronAPI.fetchTtsAudio(text, langLocale)
    if (dataUri) {
      const audio = new Audio(dataUri)
      audio.onended = onDone
      audio.onerror = () => fallbackToWebSpeech(text, langLocale, onDone)
      await audio.play()
      return
    }
  } catch {
    // ignore
  }
  fallbackToWebSpeech(text, langLocale, onDone)
}

function fallbackToWebSpeech(text: string, langLocale: string, onDone: () => void) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langLocale
    utterance.rate = 0.95
    utterance.onend = onDone
    utterance.onerror = onDone
    window.speechSynthesis.speak(utterance)
  } else {
    onDone()
  }
}
