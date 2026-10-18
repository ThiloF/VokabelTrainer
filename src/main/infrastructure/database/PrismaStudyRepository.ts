import { inject, injectable } from 'tsyringe'
import { IProfileRepository, IStudyRepository } from '@main/domain/repositories'
import { PrismaService } from './PrismaService'
import { GamificationService } from '@main/domain/services/GamificationService'
import {
  DashboardStatsDTO,
  StudyProgressDTO,
  TrainingMode,
  UserProfileDTO
} from '@shared/dto'

@injectable()
export class PrismaStudyRepository implements IStudyRepository, IProfileRepository {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(GamificationService) private readonly gamification: GamificationService
  ) {}

  public async getProfile(): Promise<UserProfileDTO> {
    let profile = await this.prisma.client.userProfile.findUnique({
      where: { id: 'default-user' }
    })
    if (!profile) {
      profile = await this.prisma.client.userProfile.create({
        data: {
          id: 'default-user',
          totalXp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          dailyGoalCards: 20,
          typoToleranceEnabled: true,
          maxTypoDistance: 1,
          preferredTtsProvider: 'AUTO',
          deeplApiKey: process.env.DEEPL_API_KEY || null,
          googleTranslateApiKey: process.env.GOOGLE_TRANSLATE_API_KEY || null
        }
      })
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const reviewedTodayCount = await this.prisma.client.reviewLog.count({
      where: { reviewedAt: { gte: startOfToday } }
    })

    const levelInfo = this.gamification.computeLevel(profile.totalXp)

    return {
      id: profile.id,
      totalXp: profile.totalXp,
      level: levelInfo.level,
      xpForCurrentLevel: levelInfo.xpForCurrentLevel,
      xpForNextLevel: levelInfo.xpForNextLevel,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      lastActiveDate: profile.lastActiveDate,
      dailyGoalCards: profile.dailyGoalCards,
      reviewedTodayCount,
      typoToleranceEnabled: profile.typoToleranceEnabled,
      maxTypoDistance: profile.maxTypoDistance,
      preferredTtsProvider: profile.preferredTtsProvider,
      deeplApiKey: profile.deeplApiKey,
      googleTranslateApiKey: profile.googleTranslateApiKey
    }
  }

  public async updateProfile(data: Partial<UserProfileDTO>): Promise<UserProfileDTO> {
    await this.getProfile() // Ensure default row exists
    await this.prisma.client.userProfile.update({
      where: { id: 'default-user' },
      data: {
        totalXp: data.totalXp,
        level: data.level,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        lastActiveDate: data.lastActiveDate,
        dailyGoalCards: data.dailyGoalCards,
        typoToleranceEnabled: data.typoToleranceEnabled,
        maxTypoDistance: data.maxTypoDistance,
        preferredTtsProvider: data.preferredTtsProvider,
        deeplApiKey: data.deeplApiKey,
        googleTranslateApiKey: data.googleTranslateApiKey
      }
    })
    return this.getProfile()
  }

  public async getProgress(vocabularyId: string): Promise<StudyProgressDTO | null> {
    const p = await this.prisma.client.studyProgress.findUnique({
      where: { vocabularyId }
    })
    if (!p) return null
    return {
      easeFactor: p.easeFactor,
      intervalDays: p.intervalDays,
      repetitions: p.repetitions,
      nextReviewAt: p.nextReviewAt.toISOString(),
      lastReviewedAt: p.lastReviewedAt ? p.lastReviewedAt.toISOString() : null,
      successCount: p.successCount,
      failCount: p.failCount,
      streak: p.streak,
      masteryLevel: p.masteryLevel
    }
  }

  public async saveProgress(
    vocabularyId: string,
    progress: StudyProgressDTO
  ): Promise<StudyProgressDTO> {
    const saved = await this.prisma.client.studyProgress.upsert({
      where: { vocabularyId },
      update: {
        easeFactor: progress.easeFactor,
        intervalDays: progress.intervalDays,
        repetitions: progress.repetitions,
        nextReviewAt: new Date(progress.nextReviewAt),
        lastReviewedAt: progress.lastReviewedAt ? new Date(progress.lastReviewedAt) : new Date(),
        successCount: progress.successCount,
        failCount: progress.failCount,
        streak: progress.streak,
        masteryLevel: progress.masteryLevel
      },
      create: {
        vocabularyId,
        easeFactor: progress.easeFactor,
        intervalDays: progress.intervalDays,
        repetitions: progress.repetitions,
        nextReviewAt: new Date(progress.nextReviewAt),
        lastReviewedAt: progress.lastReviewedAt ? new Date(progress.lastReviewedAt) : new Date(),
        successCount: progress.successCount,
        failCount: progress.failCount,
        streak: progress.streak,
        masteryLevel: progress.masteryLevel
      }
    })

    return {
      easeFactor: saved.easeFactor,
      intervalDays: saved.intervalDays,
      repetitions: saved.repetitions,
      nextReviewAt: saved.nextReviewAt.toISOString(),
      lastReviewedAt: saved.lastReviewedAt ? saved.lastReviewedAt.toISOString() : null,
      successCount: saved.successCount,
      failCount: saved.failCount,
      streak: saved.streak,
      masteryLevel: saved.masteryLevel
    }
  }

  public async resetProgress(vocabularyId: string): Promise<void> {
    await this.prisma.client.studyProgress.upsert({
      where: { vocabularyId },
      update: {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: new Date(),
        lastReviewedAt: null,
        successCount: 0,
        failCount: 0,
        streak: 0,
        masteryLevel: 0
      },
      create: {
        vocabularyId,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextReviewAt: new Date()
      }
    })
  }

  public async recordReviewLog(entry: {
    vocabularyId: string
    mode: TrainingMode
    quality: number
    wasCorrect: boolean
    wasAlmostRight: boolean
    givenAnswer?: string
    responseTimeMs: number
    earnedXp: number
  }): Promise<void> {
    await this.prisma.client.reviewLog.create({
      data: {
        vocabularyId: entry.vocabularyId,
        mode: entry.mode,
        quality: entry.quality,
        wasCorrect: entry.wasCorrect,
        wasAlmostRight: entry.wasAlmostRight,
        givenAnswer: entry.givenAnswer ?? null,
        responseTimeMs: entry.responseTimeMs,
        earnedXp: entry.earnedXp
      }
    })
  }

  public async getDashboardStats(profile: UserProfileDTO): Promise<DashboardStatsDTO> {
    const now = new Date()
    const allVocabs = await this.prisma.client.vocabulary.findMany({
      include: {
        progress: true,
        sourceLanguage: true
      }
    })

    const totalVocabularies = allVocabs.length
    let dueNowCount = 0
    const masteryDistribution = {
      newCount: 0,
      learningCount: 0,
      familiarCount: 0,
      confidentCount: 0,
      masteredCount: 0
    }

    const langMap = new Map<
      string,
      { language: any; count: number; dueCount: number }
    >()

    for (const v of allVocabs) {
      const p = v.progress
      const isDue = !p || p.nextReviewAt <= now
      if (isDue) dueNowCount++

      const level = p?.masteryLevel ?? 0
      if (level === 0) masteryDistribution.newCount++
      else if (level === 1) masteryDistribution.learningCount++
      else if (level === 2) masteryDistribution.familiarCount++
      else if (level === 3) masteryDistribution.confidentCount++
      else masteryDistribution.masteredCount++

      if (v.sourceLanguage) {
        const entry = langMap.get(v.sourceLanguageId) ?? {
          language: v.sourceLanguage,
          count: 0,
          dueCount: 0
        }
        entry.count++
        if (isDue) entry.dueCount++
        langMap.set(v.sourceLanguageId, entry)
      }
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const allLogs = await this.prisma.client.reviewLog.findMany({
      orderBy: { reviewedAt: 'desc' }
    })

    const totalReviews = allLogs.length
    const totalCorrect = allLogs.filter((l) => l.wasCorrect).length
    const overallAccuracy =
      totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 100

    const recentActivity: Array<{
      date: string
      reviewsCount: number
      correctCount: number
      earnedXp: number
    }> = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = this.gamification.toDateString(d)
      recentActivity.push({
        date: dateStr,
        reviewsCount: 0,
        correctCount: 0,
        earnedXp: 0
      })
    }

    for (const log of allLogs) {
      if (log.reviewedAt >= sevenDaysAgo) {
        const dStr = this.gamification.toDateString(log.reviewedAt)
        const bucket = recentActivity.find((b) => b.date === dStr)
        if (bucket) {
          bucket.reviewsCount++
          if (log.wasCorrect) bucket.correctCount++
          bucket.earnedXp += log.earnedXp
        }
      }
    }

    return {
      totalVocabularies,
      dueNowCount,
      masteryDistribution,
      overallAccuracy,
      totalReviews,
      recentActivity,
      languageCounts: Array.from(langMap.values()),
      profile
    }
  }
}
