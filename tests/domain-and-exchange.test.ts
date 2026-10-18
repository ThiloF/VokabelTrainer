import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { SM2Service } from '../src/main/domain/services/SM2Service'
import { AnswerEvaluator } from '../src/main/domain/services/AnswerEvaluator'
import { GamificationService } from '../src/main/domain/services/GamificationService'
import { JsonExchangeStrategy } from '../src/main/infrastructure/exchange/JsonExchangeStrategy'
import { XmlExchangeStrategy } from '../src/main/infrastructure/exchange/XmlExchangeStrategy'
import { CsvExchangeStrategy } from '../src/main/infrastructure/exchange/CsvExchangeStrategy'
import { VocabularyDTO } from '../src/shared/dto'

describe('DDD Domain Services & Exchange Strategies', () => {
  describe('SM2Service (Spaced Repetition)', () => {
    const sm2 = new SM2Service()

    it('initializes first successful recall to 1 day interval and learning mastery', () => {
      const now = new Date('2026-10-18T12:00:00Z')
      const next = sm2.calculateNextState(null, 5, now)

      expect(next.repetitions).toBe(1)
      expect(next.intervalDays).toBe(1)
      expect(next.successCount).toBe(1)
      expect(next.failCount).toBe(0)
      expect(next.streak).toBe(1)
      expect(next.easeFactor).toBeGreaterThan(2.5)
      expect(next.masteryLevel).toBe(1)
    })

    it('increases interval exponentially on consecutive successes', () => {
      let state = sm2.calculateNextState(null, 4)
      expect(state.intervalDays).toBe(1)

      state = sm2.calculateNextState(state, 4)
      expect(state.intervalDays).toBe(4)
      expect(state.masteryLevel).toBe(2)

      state = sm2.calculateNextState(state, 5)
      expect(state.intervalDays).toBeGreaterThanOrEqual(10)
      expect(state.masteryLevel).toBe(3)
    })

    it('resets repetitions and interval on failed recall while preserving easeFactor >= 1.3', () => {
      const initial = {
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 3,
        successCount: 5,
        failCount: 0,
        streak: 3
      }
      const failed = sm2.calculateNextState(initial, 1)

      expect(failed.repetitions).toBe(0)
      expect(failed.intervalDays).toBe(0)
      expect(failed.failCount).toBe(1)
      expect(failed.streak).toBe(0)
      expect(failed.easeFactor).toBeGreaterThanOrEqual(1.3)
    })
  })

  describe('AnswerEvaluator (Levenshtein & Typo Tolerance)', () => {
    const evaluator = new AnswerEvaluator()

    it('accepts exact matches case-insensitively', () => {
      const res = evaluator.evaluate('  Widerstandsfähigkeit! ', [
        'Widerstandsfähigkeit',
        'Belastbarkeit'
      ])
      expect(res.isCorrect).toBe(true)
      expect(res.isAlmostRight).toBe(false)
      expect(res.levenshteinDistance).toBe(0)
      expect(res.qualityScore).toBeGreaterThanOrEqual(4)
    })

    it('tolerates 1-character typo when typoToleranceEnabled is true', () => {
      const res = evaluator.evaluate('serendipital', ['serendipity'], {
        typoToleranceEnabled: true,
        maxTypoDistance: 1
      })
      // Distance between 'serendipital' and 'serendipity' is 2 -> should fail maxTypoDistance=1
      expect(res.isCorrect).toBe(false)

      const singleTypo = evaluator.evaluate('serendipiti', ['serendipity'], {
        typoToleranceEnabled: true,
        maxTypoDistance: 1
      })
      expect(singleTypo.isCorrect).toBe(true)
      expect(singleTypo.isAlmostRight).toBe(true)
      expect(singleTypo.levenshteinDistance).toBe(1)
      expect(singleTypo.qualityScore).toBe(3)
    })
  })

  describe('GamificationService (XP, Combos & Daily Streaks)', () => {
    const gamification = new GamificationService()

    it('calculates XP with combo bonus and increments consecutive daily streak', () => {
      const now = new Date('2026-10-18T14:00:00')
      const res = gamification.calculateReviewReward({
        mode: 'TYPING',
        isCorrect: true,
        isAlmostRight: false,
        currentCombo: 5,
        totalXp: 190,
        currentStreak: 4,
        longestStreak: 4,
        lastActiveDate: '2026-10-17',
        now
      })

      expect(res.earnedXp).toBeGreaterThanOrEqual(20)
      expect(res.newCombo).toBe(6)
      expect(res.newTotalXp).toBeGreaterThanOrEqual(210)
      expect(res.newLevel).toBe(2)
      expect(res.currentStreak).toBe(5)
      expect(res.longestStreak).toBe(5)
    })
  })

  describe('Import / Export Strategies (JSON, XML, CSV/TSV)', () => {
    const sampleVocabs: VocabularyDTO[] = [
      {
        id: 'v-1',
        sourceText: 'resilience',
        targetTexts: ['Widerstandsfähigkeit', 'Belastbarkeit'],
        partOfSpeech: 'noun',
        phonetic: '/rɪˈzɪliəns/',
        notes: 'System-Resilienz',
        difficulty: 3,
        sourceLanguageId: 'lang-en',
        targetLanguageId: 'lang-de',
        tags: [{ id: 't-1', name: 'B2-C1', color: '#10b981' }],
        examples: [
          {
            sentence: 'Building resilience is key.',
            translation: 'Widerstandsfähigkeit aufzubauen ist entscheidend.',
            clozeWord: 'resilience'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    it('round-trips JSON export and import accurately', () => {
      const jsonStrategy = new JsonExchangeStrategy()
      const serialized = jsonStrategy.serialize(sampleVocabs, true)
      const parsed = jsonStrategy.parse(serialized, {
        sourceLanguageId: 'lang-en',
        targetLanguageId: 'lang-de'
      })

      expect(parsed).toHaveLength(1)
      expect(parsed[0].sourceText).toBe('resilience')
      expect(parsed[0].targetTexts).toEqual(['Widerstandsfähigkeit', 'Belastbarkeit'])
      expect(parsed[0].tagNames).toContain('B2-C1')
    })

    it('round-trips XML export and import accurately', () => {
      const xmlStrategy = new XmlExchangeStrategy()
      const serialized = xmlStrategy.serialize(sampleVocabs, false)
      expect(serialized).toContain('<vocabularyCollection')

      const parsed = xmlStrategy.parse(serialized, {
        sourceLanguageId: 'lang-en',
        targetLanguageId: 'lang-de'
      })

      expect(parsed).toHaveLength(1)
      expect(parsed[0].sourceText).toBe('resilience')
      expect(parsed[0].targetTexts).toEqual(['Widerstandsfähigkeit', 'Belastbarkeit'])
    })

    it('round-trips CSV export and parses Anki headerless TSV', () => {
      const csvStrategy = new CsvExchangeStrategy()
      const serialized = csvStrategy.serialize(sampleVocabs)
      const parsed = csvStrategy.parse(serialized, {
        sourceLanguageId: 'lang-en',
        targetLanguageId: 'lang-de'
      })

      expect(parsed).toHaveLength(1)
      expect(parsed[0].sourceText).toBe('resilience')

      const ankiTsv = `ubiquitous\tallgegenwärtig; überall verbreitet\tC1 Business`
      const parsedAnki = csvStrategy.parse(ankiTsv, {
        sourceLanguageId: 'lang-en',
        targetLanguageId: 'lang-de'
      })
      expect(parsedAnki).toHaveLength(1)
      expect(parsedAnki[0].sourceText).toBe('ubiquitous')
      expect(parsedAnki[0].targetTexts).toEqual(['allgegenwärtig', 'überall verbreitet'])
    })
  })
})
