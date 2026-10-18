import { inject, injectable } from 'tsyringe'
import { ILexiconRepository } from '@main/domain/repositories'
import { PrismaService } from './PrismaService'
import {
  CategoryDTO,
  LanguageDTO,
  SaveVocabularyInput,
  TagDTO,
  VocabularyDTO,
  VocabularyFilterInput
} from '@shared/dto'

@injectable()
export class PrismaLexiconRepository implements ILexiconRepository {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  public async getLanguages(): Promise<LanguageDTO[]> {
    const list = await this.prisma.client.language.findMany({
      orderBy: { name: 'asc' }
    })
    return list.map((l) => ({
      id: l.id,
      code: l.code,
      locale: l.locale,
      name: l.name,
      flag: l.flag
    }))
  }

  public async saveLanguage(
    data: Partial<LanguageDTO> & { code: string; name: string; locale: string; flag: string }
  ): Promise<LanguageDTO> {
    if (data.id) {
      const updated = await this.prisma.client.language.update({
        where: { id: data.id },
        data: {
          code: data.code.toLowerCase().trim(),
          name: data.name.trim(),
          locale: data.locale.trim(),
          flag: data.flag
        }
      })
      return updated
    }
    const upserted = await this.prisma.client.language.upsert({
      where: { code: data.code.toLowerCase().trim() },
      update: {
        name: data.name.trim(),
        locale: data.locale.trim(),
        flag: data.flag
      },
      create: {
        code: data.code.toLowerCase().trim(),
        name: data.name.trim(),
        locale: data.locale.trim(),
        flag: data.flag
      }
    })
    return upserted
  }

  public async deleteLanguage(id: string): Promise<void> {
    await this.prisma.client.language.delete({ where: { id } })
  }

  public async getCategories(): Promise<CategoryDTO[]> {
    const list = await this.prisma.client.category.findMany({
      include: {
        vocabularies: {
          include: { progress: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    const now = new Date()
    return list.map((c) => {
      let newCount = 0
      let learningCount = 0
      let familiarCount = 0
      let confidentCount = 0
      let masteredCount = 0
      let dueCount = 0
      let totalMasteryPoints = 0
      let totalSuccess = 0
      let totalFail = 0

      for (const v of c.vocabularies) {
        const level = v.progress?.masteryLevel ?? 0
        const started = ((v.progress?.successCount ?? 0) + (v.progress?.failCount ?? 0)) > 0
        if (level === 0 && !started) newCount++
        else if (level <= 1) learningCount++
        else if (level === 2) familiarCount++
        else if (level === 3) confidentCount++
        else masteredCount++

        if (!v.progress || v.progress.nextReviewAt <= now) {
          dueCount++
        }
        // Score weighting: started level 0 gives 10%, level 1 gives 25%, level 2 gives 50%, level 3 gives 75%, level 4 gives 100%
        if (level === 0) totalMasteryPoints += started ? 10 : 0
        else if (level === 1) totalMasteryPoints += 25
        else if (level === 2) totalMasteryPoints += 50
        else if (level === 3) totalMasteryPoints += 75
        else totalMasteryPoints += 100

        totalSuccess += v.progress?.successCount ?? 0
        totalFail += v.progress?.failCount ?? 0
      }

      const totalVocab = c.vocabularies.length
      const folderScorePercent = totalVocab > 0 ? Math.round(totalMasteryPoints / totalVocab) : 0
      const totalAttempts = totalSuccess + totalFail
      const accuracyPercent = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
        vocabularyCount: totalVocab,
        newCount,
        learningCount,
        familiarCount,
        confidentCount,
        masteredCount,
        dueCount,
        folderScorePercent,
        accuracyPercent
      }
    })
  }

  public async saveCategory(data: Partial<CategoryDTO> & { name: string }): Promise<CategoryDTO> {
    if (data.id) {
      const updated = await this.prisma.client.category.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          description: data.description ?? null,
          color: data.color ?? '#6366f1',
          icon: data.icon ?? 'Folder'
        }
      })
      return updated
    }
    const upserted = await this.prisma.client.category.upsert({
      where: { name: data.name.trim() },
      update: {
        description: data.description ?? undefined,
        color: data.color ?? undefined,
        icon: data.icon ?? undefined
      },
      create: {
        name: data.name.trim(),
        description: data.description ?? null,
        color: data.color ?? '#6366f1',
        icon: data.icon ?? 'Folder'
      }
    })
    return upserted
  }

  public async deleteCategory(id: string): Promise<void> {
    await this.prisma.client.category.delete({ where: { id } })
  }

  public async getTags(): Promise<TagDTO[]> {
    const list = await this.prisma.client.tag.findMany({
      include: { _count: { select: { vocabularies: true } } },
      orderBy: { name: 'asc' }
    })
    return list.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      vocabularyCount: t._count.vocabularies
    }))
  }

  public async saveTag(data: Partial<TagDTO> & { name: string }): Promise<TagDTO> {
    if (data.id) {
      return await this.prisma.client.tag.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          color: data.color ?? '#10b981'
        }
      })
    }
    return await this.prisma.client.tag.upsert({
      where: { name: data.name.trim() },
      update: { color: data.color ?? undefined },
      create: {
        name: data.name.trim(),
        color: data.color ?? '#10b981'
      }
    })
  }

  public async deleteTag(id: string): Promise<void> {
    await this.prisma.client.tag.delete({ where: { id } })
  }

  public async getVocabularies(filter?: VocabularyFilterInput): Promise<VocabularyDTO[]> {
    const where: any = {}

    if (filter?.sourceLanguageId) {
      where.sourceLanguageId = filter.sourceLanguageId
    }
    if (filter?.targetLanguageId) {
      where.targetLanguageId = filter.targetLanguageId
    }
    if (filter?.categoryId) {
      where.categoryId = filter.categoryId
    }
    if (filter?.tagId) {
      where.tags = { some: { tagId: filter.tagId } }
    }
    if (filter?.masteryLevel !== undefined) {
      where.progress = { masteryLevel: filter.masteryLevel }
    }
    if (filter?.dueOnly) {
      where.OR = [
        { progress: null },
        { progress: { nextReviewAt: { lte: new Date() } } }
      ]
    }
    const items = await this.prisma.client.vocabulary.findMany({
      where,
      include: {
        sourceLanguage: true,
        targetLanguage: true,
        category: true,
        tags: { include: { tag: true } },
        examples: true,
        progress: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    let mapped = items.map((v) => this.mapVocabulary(v))
    if (filter?.search && filter.search.trim().length > 0) {
      const q = filter.search.trim().toLowerCase()
      mapped = mapped.filter(
        (v) =>
          v.sourceText.toLowerCase().includes(q) ||
          v.targetTexts.some((t) => t.toLowerCase().includes(q)) ||
          (v.notes && v.notes.toLowerCase().includes(q)) ||
          v.tags.some((t) => t.name.toLowerCase().includes(q))
      )
    }
    return mapped
  }

  public async getVocabularyById(id: string): Promise<VocabularyDTO | null> {
    const item = await this.prisma.client.vocabulary.findUnique({
      where: { id },
      include: {
        sourceLanguage: true,
        targetLanguage: true,
        category: true,
        tags: { include: { tag: true } },
        examples: true,
        progress: true
      }
    })
    return item ? this.mapVocabulary(item) : null
  }

  public async saveVocabulary(input: SaveVocabularyInput): Promise<VocabularyDTO> {
    // Resolve tagNames if provided (e.g. during Import or quick tag creation)
    const resolvedTagIds = new Set<string>(input.tagIds ?? [])
    if (input.tagNames && input.tagNames.length > 0) {
      for (const rawName of input.tagNames) {
        const cleanName = rawName.trim()
        if (!cleanName) continue
        const tag = await this.saveTag({ name: cleanName })
        resolvedTagIds.add(tag.id)
      }
    }

    const cleanTargets = input.targetTexts
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    const examplesData = (input.examples ?? [])
      .filter((ex) => ex.sentence && ex.sentence.trim().length > 0)
      .map((ex) => ({
        sentence: ex.sentence.trim(),
        translation: ex.translation?.trim() || null,
        clozeWord: ex.clozeWord?.trim() || input.sourceText.trim()
      }))

    if (input.id) {
      await this.prisma.client.vocabularyTag.deleteMany({
        where: { vocabularyId: input.id }
      })
      await this.prisma.client.exampleSentence.deleteMany({
        where: { vocabularyId: input.id }
      })

      const updated = await this.prisma.client.vocabulary.update({
        where: { id: input.id },
        data: {
          sourceText: input.sourceText.trim(),
          targetTexts: cleanTargets,
          partOfSpeech: input.partOfSpeech?.trim() || null,
          phonetic: input.phonetic?.trim() || null,
          audioUrl: input.audioUrl?.trim() || null,
          notes: input.notes?.trim() || null,
          difficulty: input.difficulty ?? 1,
          sourceLanguageId: input.sourceLanguageId,
          targetLanguageId: input.targetLanguageId,
          categoryId: input.categoryId || null,
          tags: {
            create: Array.from(resolvedTagIds).map((tagId) => ({ tagId }))
          },
          examples: {
            create: examplesData
          }
        },
        include: {
          sourceLanguage: true,
          targetLanguage: true,
          category: true,
          tags: { include: { tag: true } },
          examples: true,
          progress: true
        }
      })

      return this.mapVocabulary(updated)
    }

    const created = await this.prisma.client.vocabulary.create({
      data: {
        sourceText: input.sourceText.trim(),
        targetTexts: cleanTargets,
        partOfSpeech: input.partOfSpeech?.trim() || null,
        phonetic: input.phonetic?.trim() || null,
        audioUrl: input.audioUrl?.trim() || null,
        notes: input.notes?.trim() || null,
        difficulty: input.difficulty ?? 1,
        sourceLanguageId: input.sourceLanguageId,
        targetLanguageId: input.targetLanguageId,
        categoryId: input.categoryId || null,
        tags: {
          create: Array.from(resolvedTagIds).map((tagId) => ({ tagId }))
        },
        examples: {
          create: examplesData
        },
        progress: {
          create: {
            easeFactor: 2.5,
            intervalDays: 0,
            repetitions: 0,
            nextReviewAt: new Date(),
            successCount: 0,
            failCount: 0,
            streak: 0,
            masteryLevel: 0
          }
        }
      },
      include: {
        sourceLanguage: true,
        targetLanguage: true,
        category: true,
        tags: { include: { tag: true } },
        examples: true,
        progress: true
      }
    })

    return this.mapVocabulary(created)
  }

  public async bulkSaveVocabularies(inputs: SaveVocabularyInput[]): Promise<number> {
    let count = 0
    for (const item of inputs) {
      await this.saveVocabulary(item)
      count++
    }
    return count
  }

  public async deleteVocabulary(id: string): Promise<void> {
    await this.prisma.client.vocabulary.delete({ where: { id } })
  }

  public async assignVocabulariesToCategory(
    vocabularyIds: string[],
    categoryId: string | null
  ): Promise<number> {
    if (vocabularyIds.length === 0) return 0
    const res = await this.prisma.client.vocabulary.updateMany({
      where: { id: { in: vocabularyIds } },
      data: { categoryId }
    })
    return res.count
  }

  public async populateCategoryBatch(input: {
    targetCategoryId: string
    count: number
    tagId?: string
    onlyUnstarted?: boolean
  }): Promise<number> {
    const where: any = {
      NOT: { categoryId: input.targetCategoryId }
    }
    if (input.tagId) {
      where.tags = { some: { tagId: input.tagId } }
    }
    const candidates = await this.prisma.client.vocabulary.findMany({
      where,
      include: { progress: true }
    })

    const filtered = candidates.filter((v) => {
      if (input.onlyUnstarted) {
        const started = ((v.progress?.successCount ?? 0) + (v.progress?.failCount ?? 0)) > 0
        return !started && (v.progress?.masteryLevel ?? 0) === 0
      }
      return (v.progress?.masteryLevel ?? 0) < 3
    })

    const selected = filtered
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(1, input.count))
      .map((v) => v.id)

    return this.assignVocabulariesToCategory(selected, input.targetCategoryId)
  }

  private mapVocabulary(v: any): VocabularyDTO {
    return {
      id: v.id,
      sourceText: v.sourceText,
      targetTexts: v.targetTexts,
      partOfSpeech: v.partOfSpeech,
      phonetic: v.phonetic,
      audioUrl: v.audioUrl,
      notes: v.notes,
      difficulty: v.difficulty,
      sourceLanguageId: v.sourceLanguageId,
      sourceLanguage: v.sourceLanguage
        ? {
            id: v.sourceLanguage.id,
            code: v.sourceLanguage.code,
            locale: v.sourceLanguage.locale,
            name: v.sourceLanguage.name,
            flag: v.sourceLanguage.flag
          }
        : undefined,
      targetLanguageId: v.targetLanguageId,
      targetLanguage: v.targetLanguage
        ? {
            id: v.targetLanguage.id,
            code: v.targetLanguage.code,
            locale: v.targetLanguage.locale,
            name: v.targetLanguage.name,
            flag: v.targetLanguage.flag
          }
        : undefined,
      categoryId: v.categoryId,
      category: v.category
        ? {
            id: v.category.id,
            name: v.category.name,
            description: v.category.description,
            color: v.category.color,
            icon: v.category.icon
          }
        : null,
      tags: (v.tags ?? []).map((vt: any) => ({
        id: vt.tag.id,
        name: vt.tag.name,
        color: vt.tag.color
      })),
      examples: (v.examples ?? []).map((ex: any) => ({
        id: ex.id,
        sentence: ex.sentence,
        translation: ex.translation,
        clozeWord: ex.clozeWord
      })),
      progress: v.progress
        ? {
            easeFactor: v.progress.easeFactor,
            intervalDays: v.progress.intervalDays,
            repetitions: v.progress.repetitions,
            nextReviewAt: v.progress.nextReviewAt.toISOString(),
            lastReviewedAt: v.progress.lastReviewedAt
              ? v.progress.lastReviewedAt.toISOString()
              : null,
            successCount: v.progress.successCount,
            failCount: v.progress.failCount,
            streak: v.progress.streak,
            masteryLevel: v.progress.masteryLevel
          }
        : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString()
    }
  }
}
