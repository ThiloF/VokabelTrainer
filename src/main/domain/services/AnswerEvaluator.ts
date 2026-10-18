import { injectable } from 'tsyringe'
import { CharDiffSegment } from '@shared/dto'

export interface EvaluationOutcome {
  isCorrect: boolean
  isAlmostRight: boolean
  matchedAnswer: string
  levenshteinDistance: number
  qualityScore: number
  diffSegments: CharDiffSegment[]
}

@injectable()
export class AnswerEvaluator {
  /**
   * Evaluates a user's given answer against one or more valid target translations.
   * Supports Levenshtein typo tolerance and character-by-character diff generation.
   */
  public evaluate(
    givenAnswer: string,
    expectedAnswers: string[],
    options: {
      typoToleranceEnabled?: boolean
      maxTypoDistance?: number
      responseTimeMs?: number
    } = {}
  ): EvaluationOutcome {
    const cleanGiven = this.normalize(givenAnswer)
    const validTargets = expectedAnswers.filter((a) => a.trim().length > 0)

    if (validTargets.length === 0) {
      return {
        isCorrect: false,
        isAlmostRight: false,
        matchedAnswer: '',
        levenshteinDistance: cleanGiven.length,
        qualityScore: 0,
        diffSegments: []
      }
    }

    if (!cleanGiven) {
      return {
        isCorrect: false,
        isAlmostRight: false,
        matchedAnswer: validTargets[0],
        levenshteinDistance: validTargets[0].length,
        qualityScore: 0,
        diffSegments: [{ text: validTargets[0], status: 'missing' }]
      }
    }

    let bestTarget = validTargets[0]
    let minDistance = Infinity

    for (const target of validTargets) {
      const cleanTarget = this.normalize(target)
      const dist = this.computeLevenshtein(cleanGiven, cleanTarget)
      if (dist < minDistance) {
        minDistance = dist
        bestTarget = target
      }
    }

    const maxAllowedTypos =
      options.typoToleranceEnabled !== false && bestTarget.trim().length >= 4
        ? (options.maxTypoDistance ?? 1)
        : 0

    const isExact = minDistance === 0
    const isAlmostRight = !isExact && minDistance <= maxAllowedTypos
    const isCorrect = isExact || isAlmostRight

    let qualityScore = 0
    if (isExact) {
      const fastResponse = (options.responseTimeMs ?? 4000) < 5500
      qualityScore = fastResponse ? 5 : 4
    } else if (isAlmostRight) {
      qualityScore = 3 // Passed with typo warning
    } else if (minDistance <= 2) {
      qualityScore = 2 // Close miss
    } else {
      qualityScore = 1
    }

    const diffSegments = this.buildCharDiff(givenAnswer.trim(), bestTarget.trim())

    return {
      isCorrect,
      isAlmostRight,
      matchedAnswer: bestTarget,
      levenshteinDistance: minDistance,
      qualityScore,
      diffSegments
    }
  }

  public normalize(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:"'()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
  }

  public computeLevenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        )
      }
    }

    return dp[m][n]
  }

  public buildCharDiff(given: string, expected: string): CharDiffSegment[] {
    const segments: CharDiffSegment[] = []
    const maxLen = Math.max(given.length, expected.length)

    for (let i = 0; i < maxLen; i++) {
      const gChar = given[i]
      const eChar = expected[i]

      if (gChar !== undefined && eChar !== undefined) {
        const isSame = gChar.toLowerCase() === eChar.toLowerCase()
        segments.push({
          text: eChar,
          status: isSame ? 'correct' : 'typo'
        })
      } else if (eChar !== undefined) {
        segments.push({
          text: eChar,
          status: 'missing'
        })
      }
    }

    // Merge consecutive identical statuses for cleaner rendering
    const merged: CharDiffSegment[] = []
    for (const seg of segments) {
      const last = merged[merged.length - 1]
      if (last && last.status === seg.status) {
        last.text += seg.text
      } else {
        merged.push({ ...seg })
      }
    }
    return merged
  }
}
