import { inject, injectable } from 'tsyringe'
import { DI_TOKENS, ILexiconRepository } from '@main/domain/repositories'
import { VERIFIED_ENGLISH_B_C_1000 } from './curated-en-b-c-index'
import { SaveVocabularyInput } from '@shared/dto'

@injectable()
export class DatabaseSeeder {
  private isSeeding = false

  constructor(
    @inject(DI_TOKENS.LexiconRepository) private readonly lexiconRepo: ILexiconRepository
  ) {}

  public async seedIfEmpty(): Promise<void> {
    if (this.isSeeding) return
    this.isSeeding = true

    try {
      // 1. Ensure Default Languages exist
      const de = await this.lexiconRepo.saveLanguage({
        code: 'de',
        locale: 'de-DE',
        name: 'Deutsch',
        flag: '🇩🇪'
      })
      const en = await this.lexiconRepo.saveLanguage({
        code: 'en',
        locale: 'en-US',
        name: 'Englisch',
        flag: '🇬🇧'
      })
      await this.lexiconRepo.saveLanguage({
        code: 'es',
        locale: 'es-ES',
        name: 'Spanisch',
        flag: '🇪🇸'
      })
      await this.lexiconRepo.saveLanguage({
        code: 'fr',
        locale: 'fr-FR',
        name: 'Französisch',
        flag: '🇫🇷'
      })

      // Check if the 1000 English vocabularies are already loaded
      const existingEnVocabs = await this.lexiconRepo.getVocabularies({
        sourceLanguageId: en.id
      })
      if (existingEnVocabs.length >= 1000) {
        return
      }

      // 2. Ensure Thematic Categories exist
      const categoryDefs = [
        {
          name: 'Beruf & Wirtschaft',
          description: 'Business, Finanzen, Management und Arbeitswelt (Niveau B-C)',
          color: '#b45309',
          icon: 'Briefcase'
        },
        {
          name: 'Wissenschaft & Umwelt',
          description: 'Forschung, Natur, Technologie und Ökologie (Niveau B-C)',
          color: '#047857',
          icon: 'Compass'
        },
        {
          name: 'Politik & Recht',
          description: 'Gesellschaft, Gesetzgebung, Diplomatie und Verwaltung (Niveau B-C)',
          color: '#9a3412',
          icon: 'Shield'
        },
        {
          name: 'Kommunikation & Rhetorik',
          description: 'Argumentation, Debatte, Medien und Ausdrucksweise (Niveau B-C)',
          color: '#a16207',
          icon: 'MessageCircle'
        },
        {
          name: 'Psychologie & Charakter',
          description: 'Emotionen, Verhalten, Persönlichkeit und Denken (Niveau B-C)',
          color: '#7c2d12',
          icon: 'Heart'
        },
        {
          name: 'Alltag & Gesellschaft',
          description: 'Kultur, Zusammenleben, Bildung und gehobener Alltagswortschatz',
          color: '#78350f',
          icon: 'Folder'
        }
      ]

      const categoryMap = new Map<string, string>()
      for (const c of categoryDefs) {
        const saved = await this.lexiconRepo.saveCategory(c)
        categoryMap.set(c.name, saved.id)
      }

      // 3. Build SaveVocabularyInput array for all 1,000 verified English B-C entries
      const difficultyByLevel: Record<string, number> = {
        B1: 2,
        B2: 3,
        C1: 4,
        C2: 5
      }

      const payload: SaveVocabularyInput[] = VERIFIED_ENGLISH_B_C_1000.map(
        ([sourceText, targetTexts, partOfSpeech, level, categoryName, sentence, translation]) => ({
          sourceText,
          targetTexts,
          partOfSpeech,
          difficulty: difficultyByLevel[level] ?? 3,
          sourceLanguageId: en.id,
          targetLanguageId: de.id,
          categoryId: categoryMap.get(categoryName) ?? null,
          tagNames: [level, 'Oxford-B-C', partOfSpeech],
          examples: [
            {
              sentence,
              translation,
              clozeWord: sourceText
            }
          ]
        })
      )

      await this.lexiconRepo.bulkSaveVocabularies(payload)
    } catch (err) {
      console.warn('DatabaseSeeder warning:', err)
    } finally {
      this.isSeeding = false
    }
  }
}
