import { injectable } from 'tsyringe'
import { TrainingMode } from '@shared/dto'

export interface XpCalculationResult {
  earnedXp: number
  newTotalXp: number
  newLevel: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  newCombo: number
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
}

@injectable()
export class GamificationService {
  private readonly BASE_XP_BY_MODE: Record<TrainingMode, number> = {
    FLASHCARD: 10,
    MULTIPLE_CHOICE: 12,
    MATCHING: 12,
    CLOZE: 15,
    LISTENING: 18,
    TYPING: 20
  }

  public calculateReviewReward(params: {
    mode: TrainingMode
    isCorrect: boolean
    isAlmostRight: boolean
    currentCombo: number
    totalXp: number
    currentStreak: number
    longestStreak: number
    lastActiveDate?: string | null
    now?: Date
  }): XpCalculationResult {
    const now = params.now ?? new Date()
    const todayStr = this.toDateString(now)

    let earnedXp = 0
    let newCombo = 0

    if (params.isCorrect) {
      newCombo = params.currentCombo + 1
      const base = this.BASE_XP_BY_MODE[params.mode] ?? 12
      const comboBonus = Math.min(15, Math.floor(newCombo / 3) * 3)
      const accuracyMultiplier = params.isAlmostRight ? 0.75 : 1.0
      earnedXp = Math.round((base + comboBonus) * accuracyMultiplier)
    } else {
      newCombo = 0
      earnedXp = 2 // Consolation XP for practicing
    }

    const newTotalXp = params.totalXp + earnedXp
    const levelInfo = this.computeLevel(newTotalXp)
    const streakInfo = this.updateDailyStreak(
      params.currentStreak,
      params.longestStreak,
      params.lastActiveDate,
      todayStr
    )

    return {
      earnedXp,
      newTotalXp,
      newLevel: levelInfo.level,
      xpForCurrentLevel: levelInfo.xpForCurrentLevel,
      xpForNextLevel: levelInfo.xpForNextLevel,
      newCombo,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      lastActiveDate: todayStr
    }
  }

  public computeLevel(totalXp: number): {
    level: number
    xpForCurrentLevel: number
    xpForNextLevel: number
  } {
    // Progressive XP curve: Level 1 = 0..199, Level 2 = 200..499, etc.
    let level = 1
    let threshold = 0
    let step = 200

    while (totalXp >= threshold + step) {
      threshold += step
      level += 1
      step = Math.round(step * 1.2)
    }

    return {
      level,
      xpForCurrentLevel: threshold,
      xpForNextLevel: threshold + step
    }
  }

  private updateDailyStreak(
    currentStreak: number,
    longestStreak: number,
    lastActiveDate: string | null | undefined,
    todayStr: string
  ): { currentStreak: number; longestStreak: number } {
    if (!lastActiveDate) {
      return {
        currentStreak: 1,
        longestStreak: Math.max(1, longestStreak)
      }
    }

    if (lastActiveDate === todayStr) {
      return {
        currentStreak: Math.max(1, currentStreak),
        longestStreak: Math.max(currentStreak, longestStreak)
      }
    }

    const yesterday = new Date(todayStr)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = this.toDateString(yesterday)

    if (lastActiveDate === yesterdayStr) {
      const nextStreak = currentStreak + 1
      return {
        currentStreak: nextStreak,
        longestStreak: Math.max(nextStreak, longestStreak)
      }
    }

    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak)
    }
  }

  public toDateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
