import type { CourseStats, AggregateStats, AggregateMethod } from '@shared/types'

/**
 * Core calculation engine for AttendGuard.
 * Pure functions — no DB calls, no side effects.
 *
 * Key definitions:
 *   heldSoFar   = attended + bunked  (denominator for current %)
 *   cancelled + holiday are excluded from BOTH numerator and denominator
 *   remainingClasses = future scheduled slots on non-holiday dates (after today)
 */

export interface RawCourseData {
  courseId: number
  courseName: string
  courseCode: string | null
  color: string
  creditHours: number
  effectiveThreshold: number // semester default or per-course override (0-100)
  attended: number
  bunked: number
  remaining: number // future non-holiday scheduled instances
}

/** Compute all stats for a single course. */
export function computeCourseStats(data: RawCourseData): CourseStats {
  const { attended, bunked, remaining, effectiveThreshold: threshold } = data
  const held = attended + bunked

  const currentPct: number | null = held === 0 ? null : (attended / held) * 100

  const totalIfBest = held + remaining
  const bestCasePct  = totalIfBest === 0 ? 0 : ((attended + remaining) / totalIfBest) * 100
  const worstCasePct = totalIfBest === 0 ? 0 : (attended / totalIfBest) * 100

  // safe bunks = floor(attended / (threshold/100) - held)
  // negative means already in deficit
  let safeBunksRemaining: number
  if (threshold === 0) {
    safeBunksRemaining = remaining // 0% threshold = bunk everything
  } else {
    const raw = attended / (threshold / 100) - held
    safeBunksRemaining = Math.min(Math.floor(raw), remaining)
  }

  const needToAttend = Math.max(0, -safeBunksRemaining)

  return {
    courseId: data.courseId,
    courseName: data.courseName,
    courseCode: data.courseCode,
    color: data.color,
    threshold,
    creditHours: data.creditHours,
    attendedSoFar: attended,
    heldSoFar: held,
    remainingClasses: remaining,
    currentPct,
    bestCasePct,
    worstCasePct,
    safeBunksRemaining,
    needToAttend,
    isDataAvailable: held > 0
  }
}

/**
 * Preview: what % will a course show after bunking `additionalBunks` more classes?
 * Returns null if there are no held classes yet.
 */
export function bunkPreview(
  stats: Pick<CourseStats, 'attendedSoFar' | 'heldSoFar'>,
  additionalBunks = 1
): number | null {
  const newHeld = stats.heldSoFar + additionalBunks
  if (newHeld === 0) return null
  return (stats.attendedSoFar / newHeld) * 100
}

/**
 * Aggregate stats across all courses.
 * simple: arithmetic mean of each course's currentPct (courses with no data excluded)
 * credit-weighted: weighted mean using creditHours
 *
 * safeBunksRemaining = minimum across all courses (weakest link wins)
 */
export function computeAggregateStats(
  courseStats: CourseStats[],
  method: AggregateMethod
): AggregateStats {
  if (courseStats.length === 0) {
    return { currentPct: null, bestCasePct: 0, worstCasePct: 0, safeBunksRemaining: 0, needToAttend: 0, method, courseCount: 0 }
  }

  const withData = courseStats.filter(c => c.currentPct !== null)
  let currentPct: number | null = null
  let bestCasePct = 0
  let worstCasePct = 0

  if (withData.length > 0) {
    if (method === 'simple') {
      currentPct    = withData.reduce((s, c) => s + c.currentPct!, 0) / withData.length
      bestCasePct   = courseStats.reduce((s, c) => s + c.bestCasePct, 0) / courseStats.length
      worstCasePct  = courseStats.reduce((s, c) => s + c.worstCasePct, 0) / courseStats.length
    } else {
      const wtd = withData.reduce((s, c) => s + c.creditHours, 0)
      currentPct = wtd === 0 ? null
        : withData.reduce((s, c) => s + c.currentPct! * c.creditHours, 0) / wtd

      const wta = courseStats.reduce((s, c) => s + c.creditHours, 0)
      bestCasePct  = wta === 0 ? 0 : courseStats.reduce((s, c) => s + c.bestCasePct  * c.creditHours, 0) / wta
      worstCasePct = wta === 0 ? 0 : courseStats.reduce((s, c) => s + c.worstCasePct * c.creditHours, 0) / wta
    }
  }

  const safeBunksRemaining = Math.min(...courseStats.map(c => c.safeBunksRemaining))
  const needToAttend = Math.max(0, -safeBunksRemaining)

  return { currentPct, bestCasePct, worstCasePct, safeBunksRemaining, needToAttend, method, courseCount: courseStats.length }
}

/**
 * Count remaining scheduled class instances from tomorrow through semesterEnd,
 * excluding holiday dates. Used to compute remainingClasses for each course.
 */
export function countRemainingClasses(
  dayOfWeekSchedule: number[],
  today: string,
  semesterEnd: string,
  holidaySet: Set<string>
): number {
  if (!dayOfWeekSchedule.length) return 0
  const cursor = new Date(today)
  cursor.setDate(cursor.getDate() + 1) // start from tomorrow
  const end = new Date(semesterEnd)
  if (cursor > end) return 0

  let count = 0
  while (cursor <= end) {
    const ds = cursor.toISOString().slice(0, 10)
    if (dayOfWeekSchedule.includes(cursor.getDay()) && !holidaySet.has(ds)) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}
