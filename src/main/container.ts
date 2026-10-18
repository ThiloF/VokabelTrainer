import 'reflect-metadata'
import { container } from 'tsyringe'
import { DI_TOKENS } from './domain/repositories'
import { PrismaService } from './infrastructure/database/PrismaService'
import { PrismaLexiconRepository } from './infrastructure/database/PrismaLexiconRepository'
import { PrismaStudyRepository } from './infrastructure/database/PrismaStudyRepository'
import { ResilientDatabaseRepository } from './infrastructure/database/ResilientDatabaseRepository'
import { FreeDictionaryAdapter } from './infrastructure/enrichment/FreeDictionaryAdapter'
import { MultiTranslationAdapter } from './infrastructure/enrichment/MultiTranslationAdapter'
import { GoogleTtsAudioAdapter } from './infrastructure/enrichment/GoogleTtsAudioAdapter'
import { SM2Service } from './domain/services/SM2Service'
import { AnswerEvaluator } from './domain/services/AnswerEvaluator'
import { GamificationService } from './domain/services/GamificationService'
import { JsonExchangeStrategy } from './infrastructure/exchange/JsonExchangeStrategy'
import { XmlExchangeStrategy } from './infrastructure/exchange/XmlExchangeStrategy'
import { CsvExchangeStrategy } from './infrastructure/exchange/CsvExchangeStrategy'
import { EnrichmentApplicationService } from './application/EnrichmentApplicationService'
import { LearningApplicationService } from './application/LearningApplicationService'
import { DataExchangeApplicationService } from './application/DataExchangeApplicationService'
import { DatabaseSeeder } from './infrastructure/database/DatabaseSeeder'

export function configureContainer() {
  // Singleton Infrastructure Database Clients
  container.registerSingleton(PrismaService)
  container.registerSingleton(PrismaLexiconRepository)
  container.registerSingleton(PrismaStudyRepository)
  container.registerSingleton(ResilientDatabaseRepository)

  // Domain Services
  container.registerSingleton(SM2Service)
  container.registerSingleton(AnswerEvaluator)
  container.registerSingleton(GamificationService)

  // Repositories (Ports -> Resilient PostgreSQL + Local Adapter)
  container.registerSingleton(DI_TOKENS.LexiconRepository, ResilientDatabaseRepository)
  container.registerSingleton(DI_TOKENS.StudyRepository, ResilientDatabaseRepository)
  container.registerSingleton(DI_TOKENS.ProfileRepository, ResilientDatabaseRepository)

  // External Enrichment Adapters
  container.registerSingleton(DI_TOKENS.DictionaryProvider, FreeDictionaryAdapter)
  container.registerSingleton(DI_TOKENS.TranslationProvider, MultiTranslationAdapter)
  container.registerSingleton(DI_TOKENS.AudioProvider, GoogleTtsAudioAdapter)

  // Exchange Strategies
  container.registerSingleton(JsonExchangeStrategy)
  container.registerSingleton(XmlExchangeStrategy)
  container.registerSingleton(CsvExchangeStrategy)

  // Application Layer Services
  container.registerSingleton(EnrichmentApplicationService)
  container.registerSingleton(LearningApplicationService)
  container.registerSingleton(DataExchangeApplicationService)
  container.registerSingleton(DatabaseSeeder)

  return container
}
