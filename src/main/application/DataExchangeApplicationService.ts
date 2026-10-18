import { inject, injectable } from 'tsyringe'
import {
  DI_TOKENS,
  IExchangeStrategy,
  ILexiconRepository
} from '@main/domain/repositories'
import { JsonExchangeStrategy } from '@main/infrastructure/exchange/JsonExchangeStrategy'
import { XmlExchangeStrategy } from '@main/infrastructure/exchange/XmlExchangeStrategy'
import { CsvExchangeStrategy } from '@main/infrastructure/exchange/CsvExchangeStrategy'
import {
  ExchangeFormat,
  ExportRequestDTO,
  ImportRequestDTO,
  ImportResultDTO,
  SaveVocabularyInput
} from '@shared/dto'

@injectable()
export class DataExchangeApplicationService {
  private readonly strategies: Map<ExchangeFormat, IExchangeStrategy>

  constructor(
    @inject(DI_TOKENS.LexiconRepository) private readonly lexiconRepo: ILexiconRepository,
    @inject(JsonExchangeStrategy) jsonStrategy: JsonExchangeStrategy,
    @inject(XmlExchangeStrategy) xmlStrategy: XmlExchangeStrategy,
    @inject(CsvExchangeStrategy) csvStrategy: CsvExchangeStrategy
  ) {
    this.strategies = new Map<ExchangeFormat, IExchangeStrategy>([
      ['JSON', jsonStrategy],
      ['XML', xmlStrategy],
      ['CSV', csvStrategy]
    ])
  }

  public async exportVocabularies(req: ExportRequestDTO): Promise<string> {
    const strategy = this.strategies.get(req.format)
    if (!strategy) {
      throw new Error(`Unbekanntes Export-Format: ${req.format}`)
    }
    const vocabularies = await this.lexiconRepo.getVocabularies(req.filter)
    return strategy.serialize(vocabularies, req.includeProgress)
  }

  public previewImport(req: ImportRequestDTO): SaveVocabularyInput[] {
    const strategy = this.strategies.get(req.format)
    if (!strategy) {
      throw new Error(`Unbekanntes Import-Format: ${req.format}`)
    }
    return strategy.parse(req.content, {
      sourceLanguageId: req.defaultSourceLanguageId,
      targetLanguageId: req.defaultTargetLanguageId,
      categoryId: req.defaultCategoryId
    })
  }

  public async importVocabularies(req: ImportRequestDTO): Promise<ImportResultDTO> {
    const parsedItems = this.previewImport(req)
    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const item of parsedItems) {
      try {
        if (!item.sourceText || item.targetTexts.length === 0) {
          skippedCount++
          continue
        }
        await this.lexiconRepo.saveVocabulary(item)
        importedCount++
      } catch (err: any) {
        skippedCount++
        errors.push(`${item.sourceText}: ${err?.message ?? 'Fehler beim Speichern'}`)
      }
    }

    return {
      importedCount,
      skippedCount,
      errors
    }
  }
}
