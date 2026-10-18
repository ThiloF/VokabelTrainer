import { inject, injectable } from 'tsyringe'
import { DI_TOKENS, ILexiconRepository } from '@main/domain/repositories'

@injectable()
export class DatabaseSeeder {
  constructor(
    @inject(DI_TOKENS.LexiconRepository) private readonly lexiconRepo: ILexiconRepository
  ) {}

  public async seedIfEmpty(): Promise<void> {
    try {
      const existingLanguages = await this.lexiconRepo.getLanguages()
      if (existingLanguages.length > 0) {
        return
      }

      // 1. Create Default Languages
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
      const es = await this.lexiconRepo.saveLanguage({
        code: 'es',
        locale: 'es-ES',
        name: 'Spanisch',
        flag: '🇪🇸'
      })
      const fr = await this.lexiconRepo.saveLanguage({
        code: 'fr',
        locale: 'fr-FR',
        name: 'Französisch',
        flag: '🇫🇷'
      })
      await this.lexiconRepo.saveLanguage({
        code: 'it',
        locale: 'it-IT',
        name: 'Italienisch',
        flag: '🇮🇹'
      })
      await this.lexiconRepo.saveLanguage({
        code: 'ja',
        locale: 'ja-JP',
        name: 'Japanisch',
        flag: '🇯🇵'
      })

      // 2. Create Starter Categories
      const catEveryday = await this.lexiconRepo.saveCategory({
        name: 'Alltag & Konversation',
        description: 'Wichtige Redewendungen und Begriffe für das tägliche Leben',
        color: '#6366f1',
        icon: 'MessageCircle'
      })
      const catBusiness = await this.lexiconRepo.saveCategory({
        name: 'Beruf & IT',
        description: 'Fachbegriffe für Meetings, Softwareentwicklung und Business',
        color: '#0ea5e9',
        icon: 'Briefcase'
      })
      const catTravel = await this.lexiconRepo.saveCategory({
        name: 'Reisen & Kultur',
        description: 'Unterwegs im Urlaub, im Restaurant und am Flughafen',
        color: '#f59e0b',
        icon: 'Compass'
      })

      // 3. Create Starter Tags
      await this.lexiconRepo.saveTag({ name: 'Grundwortschatz', color: '#10b981' })
      await this.lexiconRepo.saveTag({ name: 'B2-C1', color: '#8b5cf6' })
      await this.lexiconRepo.saveTag({ name: 'Häufige Verben', color: '#ec4899' })
      await this.lexiconRepo.saveTag({ name: 'Prüfung', color: '#ef4444' })

      // 4. Create Rich Starter Vocabularies (EN -> DE, ES -> DE, FR -> DE)
      const starterVocabs = [
        {
          sourceText: 'resilience',
          targetTexts: ['Widerstandsfähigkeit', 'Belastbarkeit', 'Resilienz'],
          partOfSpeech: 'noun',
          phonetic: '/rɪˈzɪliəns/',
          notes: 'Oft im psychologischen oder technischen Kontext (System-Resilienz) verwendet.',
          difficulty: 3,
          sourceLanguageId: en.id,
          targetLanguageId: de.id,
          categoryId: catBusiness.id,
          tagNames: ['B2-C1'],
          examples: [
            {
              sentence: 'Building resilience in distributed systems is crucial.',
              translation: 'Der Aufbau von Widerstandsfähigkeit in verteilten Systemen ist entscheidend.',
              clozeWord: 'resilience'
            }
          ]
        },
        {
          sourceText: 'serendipity',
          targetTexts: ['glücklicher Zufall', 'glückliche Fügung'],
          partOfSpeech: 'noun',
          phonetic: '/ˌsɛrənˈdɪpɪti/',
          notes: 'Wenn man etwas Gutes findet, wonach man gar nicht gesucht hat.',
          difficulty: 4,
          sourceLanguageId: en.id,
          targetLanguageId: de.id,
          categoryId: catEveryday.id,
          tagNames: ['B2-C1'],
          examples: [
            {
              sentence: 'We found that hidden café by pure serendipity.',
              translation: 'Wir haben dieses versteckte Café durch reinen glücklichen Zufall gefunden.',
              clozeWord: 'serendipity'
            }
          ]
        },
        {
          sourceText: 'ubiquitous',
          targetTexts: ['allgegenwärtig', 'überall verbreitet'],
          partOfSpeech: 'adjective',
          phonetic: '/juːˈbɪkwɪtəs/',
          notes: 'Sehr beliebt in wissenschaftlichen und technischen Texten.',
          difficulty: 4,
          sourceLanguageId: en.id,
          targetLanguageId: de.id,
          categoryId: catBusiness.id,
          tagNames: ['B2-C1', 'Prüfung'],
          examples: [
            {
              sentence: 'Smartphones have become ubiquitous in modern life.',
              translation: 'Smartphones sind im modernen Leben allgegenwärtig geworden.',
              clozeWord: 'ubiquitous'
            }
          ]
        },
        {
          sourceText: 'toaccomplish',
          targetTexts: ['erreichen', 'vollbringen', 'bewältigen'],
          partOfSpeech: 'verb',
          phonetic: '/əˈkʌmplɪʃ/',
          notes: 'Meist mit Zielen, Aufgaben oder Missionen kombiniert.',
          difficulty: 2,
          sourceLanguageId: en.id,
          targetLanguageId: de.id,
          categoryId: catBusiness.id,
          tagNames: ['Grundwortschatz', 'Häufige Verben'],
          examples: [
            {
              sentence: 'We can accomplish anything if we work together.',
              translation: 'Wir können alles erreichen, wenn wir zusammenarbeiten.',
              clozeWord: 'accomplish'
            }
          ]
        },
        {
          sourceText: 'la madrugada',
          targetTexts: ['Morgengrauen', 'früher Morgen', 'Nachtstunden'],
          partOfSpeech: 'noun',
          phonetic: '/maðɾuˈɣaða/',
          notes: 'Bezeichnet im Spanischen die Zeit zwischen Mitternacht und Sonnenaufgang.',
          difficulty: 2,
          sourceLanguageId: es.id,
          targetLanguageId: de.id,
          categoryId: catEveryday.id,
          tagNames: ['Grundwortschatz'],
          examples: [
            {
              sentence: 'El vuelo sale a las cuatro de la madrugada.',
              translation: 'Der Flug geht um vier Uhr morgens.',
              clozeWord: 'madrugada'
            }
          ]
        },
        {
          sourceText: 'imprescindible',
          targetTexts: ['unerlässlich', 'unverzichtbar', 'unabdingbar'],
          partOfSpeech: 'adjective',
          phonetic: '/impɾesθinˈdiβle/',
          notes: 'Stärker als "necesario".',
          difficulty: 3,
          sourceLanguageId: es.id,
          targetLanguageId: de.id,
          categoryId: catTravel.id,
          tagNames: ['B2-C1'],
          examples: [
            {
              sentence: 'El pasaporte es imprescindible para este viaje.',
              translation: 'Der Reisepass ist für diese Reise unerlässlich.',
              clozeWord: 'imprescindible'
            }
          ]
        },
        {
          sourceText: 'le dépaysement',
          targetTexts: ['Tapetenwechsel', 'Gefühl der Fremde'],
          partOfSpeech: 'noun',
          phonetic: '/depɛizmɑ̃/',
          notes: 'Positives Gefühl beim Reisen in eine völlig andere Umgebung/Kultur.',
          difficulty: 4,
          sourceLanguageId: fr.id,
          targetLanguageId: de.id,
          categoryId: catTravel.id,
          tagNames: ['B2-C1'],
          examples: [
            {
              sentence: 'Ce voyage au Japon offre un dépaysement total.',
              translation: 'Diese Reise nach Japan bietet einen kompletten Tapetenwechsel.',
              clozeWord: 'dépaysement'
            }
          ]
        }
      ]

      // Fix minor typo in starterVocabs[3]
      starterVocabs[3].sourceText = 'accomplish'

      for (const vocab of starterVocabs) {
        await this.lexiconRepo.saveVocabulary(vocab)
      }
    } catch (err) {
      console.warn('DatabaseSeeder skipped (database may not be reachable yet):', err)
    }
  }
}
