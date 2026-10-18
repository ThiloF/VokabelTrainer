import { inject, injectable } from 'tsyringe'
import {
  DI_TOKENS,
  IAudioProvider,
  IDictionaryProvider,
  IProfileRepository,
  ITranslationProvider
} from '@main/domain/repositories'
import { EnrichmentRequestDTO, EnrichmentResultDTO } from '@shared/dto'

@injectable()
export class EnrichmentApplicationService {
  constructor(
    @inject(DI_TOKENS.DictionaryProvider) private readonly dictionary: IDictionaryProvider,
    @inject(DI_TOKENS.TranslationProvider) private readonly translator: ITranslationProvider,
    @inject(DI_TOKENS.AudioProvider) private readonly audio: IAudioProvider,
    @inject(DI_TOKENS.ProfileRepository) private readonly profileRepo: IProfileRepository
  ) {}

  public async enrichVocabulary(req: EnrichmentRequestDTO): Promise<EnrichmentResultDTO> {
    const profile = await this.profileRepo.getProfile()

    const [dictData, transData] = await Promise.all([
      this.dictionary.lookupWord(req.word, req.sourceLangCode),
      this.translator.translate(req, {
        deeplApiKey: profile.deeplApiKey,
        googleTranslateApiKey: profile.googleTranslateApiKey
      })
    ])

    let audioUrl = dictData?.audioUrl
    if (!audioUrl) {
      const ttsUrl = await this.audio.fetchPronunciationUrl(req.word, req.sourceLangCode)
      if (ttsUrl) audioUrl = ttsUrl
    }

    return {
      word: req.word.trim(),
      translations: transData.translations,
      phonetic: dictData?.phonetic,
      partOfSpeech: dictData?.partOfSpeech,
      audioUrl,
      definitions: dictData?.definitions ?? [],
      examples: dictData?.examples ?? [],
      providerUsed: transData.providerUsed
    }
  }

  public async fetchTtsAudio(text: string, langCode: string): Promise<string | null> {
    return this.audio.fetchPronunciationUrl(text, langCode)
  }
}
