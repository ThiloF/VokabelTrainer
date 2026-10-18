import { injectable } from 'tsyringe'
import { StudyProgressDTO } from '@shared/dto'

export interface SM2UpdateResult {
  easeFactor: number
  intervalDays: number
  repetitions: number
  nextReviewAt: Date
  lastReviewedAt: Date
  successCount: number
  failCount: number
  streak: number
  masteryLevel: number // 0: New, 1: Learning, 2: Familiar, 3: Confident, 4: Mastered
}

@injectable()
export class SM2Service {
  /**
   * Calculates the next Spaced Repetition state based on SM-2 algorithm.
   * @param current Current progress state (or null if brand new)
   * @param quality Quality of recall between 0 (blackout) and 5 (perfect & fast recall)
   * @param now Optional reference date for testability
   */
  public calculateNextState(
    current: Partial<StudyProgressDTO> | null | undefined,
    quality: number,
    now: Date = new Date()
  ): SM2UpdateResult {
    const clampedQuality = Math.max(0, Math.min(5, Math.round(quality)))

    let easeFactor = current?.easeFactor ?? 2.5
    let intervalDays = current?.intervalDays ?? 0
    let repetitions = current?.repetitions ?? 0
    let successCount = current?.successCount ?? 0
    let failCount = current?.failCount ?? 0
    let streak = current?.streak ?? 0

    const isSuccess = clampedQuality >= 3

    if (isSuccess) {
      if (repetitions === 0) {
        intervalDays = 1
      } else if (repetitions === 1) {
        intervalDays = 4
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor))
      }
      repetitions += 1
      successCount += 1
      streak += 1
    } else {
      repetitions = 0
      intervalDays = 0 // Due again today / immediately
      failCount += 1
      streak = 0
    }

    // Standard SM-2 Ease Factor adjustment formula
    const qDiff = 5 - clampedQuality
    easeFactor = easeFactor + (0.1 - qDiff * (0.08 + qDiff * 0.02))
    if (easeFactor < 1.3) {
      easeFactor = 1.3
    }
    easeFactor = Math.round(easeFactor * 100) / 100

    const nextReviewAt = new Date(now.getTime())
    if (intervalDays > 0) {
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays)
    } else {
      // Failed cards become due again in 5 minutes
      nextReviewAt.setMinutes(nextReviewAt.getMinutes() + 5)
    }

    const masteryLevel = this.determineMasteryLevel(repetitions, intervalDays, successCount)

    return {
      easeFactor,
      intervalDays,
      repetitions,
      nextReviewAt,
      lastReviewedAt: now,
      successCount,
      failCount,
      streak,
      masteryLevel
    }
  }

  public determineMasteryLevel(repetitions: number, intervalDays: number, successCount: number): number {
    if (successCount === 0 && repetitions === 0) return 0 // New
    if (repetitions <= 1 || intervalDays <= 1) return 1 // Learning
    if (intervalDays < 7) return 2 // Familiar
    if (intervalDays < 21) return 3 // Confident
    return 4 // Mastered
  }
}
