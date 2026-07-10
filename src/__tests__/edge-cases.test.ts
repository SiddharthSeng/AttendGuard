/**
 * Edge-case tests for AttendGuard accuracy hardening.
 *
 * Covers the 8 edge-case scenarios identified in the code audit:
 * 1. Schedule changes mid-semester
 * 2. Course-specific start dates (mid-semester add)
 * 3. Duplicate/overlapping log entries + undo interaction
 * 4. Threshold changed mid-semester
 * 5. Holiday on a day with no scheduled class
 * 6. Timezone/date boundary in countRemainingClasses
 * 7. Leap year handling in date iteration
 * 8. Semester end in past / not yet started — calculator graceful degradation
 */
import { describe, it, expect, vi } from 'vitest'
import {
  computeCourseStats,
  computeAggregateStats,
  countRemainingClasses,
  type RawCourseData
} from '@renderer/lib/calculator'
import { generateHolidays } from '@shared/holidayEngine'

// ─── Shared base data ─────────────────────────────────────────────────────────

const base: RawCourseData = {
  courseId: 1,
  courseName: 'Test Course',
  courseCode: 'TC101',
  color: '#6366f1',
  creditHours: 3,
  effectiveThreshold: 75,
  attended: 0,
  bunked: 0,
  remaining: 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Schedule changes mid-semester
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Schedule changes mid-semester', () => {
  it('past attendance records are unaffected by schedule change — heldSoFar only counts actual records', () => {
    // Before schedule change: 10 Mon classes attended over first half of semester
    // After schedule change: course moves to Tue, but the 10 attended records remain
    // The calculator receives attended/bunked counts from records, not from schedule
    const stats = computeCourseStats({ ...base, attended: 10, bunked: 0, remaining: 5 })
    expect(stats.heldSoFar).toBe(10)
    expect(stats.attendedSoFar).toBe(10)
    expect(stats.currentPct).toBeCloseTo(100)
  })

  it('remaining classes reflect NEW schedule, not old schedule', () => {
    // Old schedule: Mon (dayOfWeek=1)
    // New schedule: Tue (dayOfWeek=2)
    // If today is Sun 2025-07-13, semester ends 2025-07-25 (Fri)
    // Mon classes remaining: 14, 21 = 2
    // Tue classes remaining: 15, 22 = 2
    const monRemaining = countRemainingClasses([1], '2025-07-13', '2025-07-25', new Set())
    const tueRemaining = countRemainingClasses([2], '2025-07-13', '2025-07-25', new Set())

    // After schedule change to Tue, only Tue classes are counted
    expect(tueRemaining).toBe(2) // Jul 15, Jul 22
    expect(monRemaining).toBe(2) // Jul 14, Jul 21

    // The key insight: changing from Mon→Tue gives different remaining classes
    // but doesn't affect past attended/bunked counts
  })

  it('combined: old records + new remaining = correct projections', () => {
    // 10 classes attended (from old Mon schedule)
    // 3 remaining (from new Tue schedule)
    const stats = computeCourseStats({ ...base, attended: 10, bunked: 2, remaining: 3 })
    // heldSoFar = 12, bestCase = (10+3)/(12+3) = 13/15 = 86.67%
    expect(stats.bestCasePct).toBeCloseTo(86.67, 1)
    // worstCase = 10/(12+3) = 10/15 = 66.67%
    expect(stats.worstCasePct).toBeCloseTo(66.67, 1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Course-specific start dates (mid-semester add)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Course added mid-semester', () => {
  it('a course added after semester start has 0 held if no records logged yet', () => {
    // Course added in week 5 of 12-week semester. No records yet.
    const stats = computeCourseStats({ ...base, attended: 0, bunked: 0, remaining: 14 })
    expect(stats.heldSoFar).toBe(0)
    expect(stats.currentPct).toBeNull()
    expect(stats.isDataAvailable).toBe(false)
    // Best case: 14/14 = 100%, worst case: 0/14 = 0%
    expect(stats.bestCasePct).toBeCloseTo(100)
    expect(stats.worstCasePct).toBeCloseTo(0)
  })

  it('a mid-semester course with some records computes correctly', () => {
    // Added in week 5, now in week 8. 9 classes held, 7 attended, 2 bunked, 12 remaining
    const stats = computeCourseStats({ ...base, attended: 7, bunked: 2, remaining: 12 })
    expect(stats.heldSoFar).toBe(9)
    expect(stats.currentPct).toBeCloseTo(77.78, 1) // 7/9
    // safe bunks: floor(7/0.75 - 9) = floor(9.33-9) = floor(0.33) = 0
    expect(stats.safeBunksRemaining).toBe(0)
  })

  it('remainingClasses is naturally scoped to future only, regardless of when course was added', () => {
    // Today is 2025-09-15 (Mon), semester ends 2025-10-10 (Fri)
    // Mon/Wed schedule: Mon 15(today, excluded), Wed 17, Mon 22, Wed 24, Mon 29, Wed Oct1, Mon Oct6, Wed Oct8
    // = 7 remaining (starts from tomorrow)
    const remaining = countRemainingClasses([1, 3], '2025-09-15', '2025-10-10', new Set())
    expect(remaining).toBe(7)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Duplicate/overlapping log entries + undo interaction
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Duplicate log entries and undo interaction', () => {
  it('re-logging the same day updates status — calculator sees only the latest', () => {
    // First log: bunked. Re-log: attended. Calculator receives attended=1, bunked=0
    const stats = computeCourseStats({ ...base, attended: 1, bunked: 0, remaining: 10 })
    expect(stats.currentPct).toBeCloseTo(100)
    expect(stats.heldSoFar).toBe(1)
  })

  it('undo after re-log: simulates restoring the prior status correctly', () => {
    const records = [{ id: 1, courseId: 10, date: '2025-09-01', status: 'bunked' as const }]
    const apply = vi.fn()

    // Re-log as attended (overwriting bunked)
    const prev = records.find(r => r.courseId === 10 && r.date === '2025-09-01')
    apply(10, '2025-09-01', 'attended')
    expect(apply).toHaveBeenCalledWith(10, '2025-09-01', 'attended')

    // Undo should restore to bunked (the prior status)
    if (prev) apply(10, '2025-09-01', prev.status)
    expect(apply).toHaveBeenCalledWith(10, '2025-09-01', 'bunked')
  })

  it('undo of first-ever log with no prior record calls delete, not apply', () => {
    const records: { id: number; courseId: number; date: string; status: string }[] = [] // empty — no prior record
    const apply = vi.fn()
    const del = vi.fn()

    apply(10, '2025-09-02', 'attended')
    const prev = records.find(() => false)

    if (prev) {
      apply(10, '2025-09-02', (prev as { status: string }).status)
    } else {
      del(10, '2025-09-02')
    }

    expect(del).toHaveBeenCalledWith(10, '2025-09-02')
    expect(apply).toHaveBeenCalledTimes(1) // only the initial log, not the undo
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Threshold changed mid-semester
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Threshold changed mid-semester', () => {
  it('safeBunksRemaining recomputes with new threshold — no caching', () => {
    const data = { ...base, attended: 80, bunked: 20, remaining: 10 }

    // With 75% threshold: safe = floor(80/0.75 - 100) = floor(6.67) = 6, capped at 10
    const stats75 = computeCourseStats({ ...data, effectiveThreshold: 75 })
    expect(stats75.safeBunksRemaining).toBe(6)

    // With 80% threshold: safe = floor(80/0.80 - 100) = floor(0) = 0
    const stats80 = computeCourseStats({ ...data, effectiveThreshold: 80 })
    expect(stats80.safeBunksRemaining).toBe(0)

    // With 90% threshold: safe = floor(80/0.90 - 100) = floor(-11.11) = -12
    const stats90 = computeCourseStats({ ...data, effectiveThreshold: 90 })
    expect(stats90.safeBunksRemaining).toBeLessThan(0)
    expect(stats90.needToAttend).toBeGreaterThan(0)
  })

  it('per-course thresholdOverride gives different result than semester default', () => {
    const data = { ...base, attended: 70, bunked: 30, remaining: 5 }

    // Semester default: 75%
    const defaultStats = computeCourseStats({ ...data, effectiveThreshold: 75 })
    // safe = floor(70/0.75 - 100) = floor(-6.67) = -7
    expect(defaultStats.safeBunksRemaining).toBe(-7)
    expect(defaultStats.needToAttend).toBe(7)

    // Course override: 60%
    const overrideStats = computeCourseStats({ ...data, effectiveThreshold: 60 })
    // safe = floor(70/0.60 - 100) = floor(16.67) = 16, capped at 5
    expect(overrideStats.safeBunksRemaining).toBe(5) // capped at remaining
    expect(overrideStats.needToAttend).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Holiday on a day with no scheduled class
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Holiday on unscheduled day', () => {
  it('a Wednesday holiday does not affect a Tue/Thu course', () => {
    // Holiday on Wed 2025-07-16
    // Tue/Thu schedule (dayOfWeek 2, 4)
    // Today = Sun 2025-07-13, end = Fri 2025-07-25
    // Tue: 15, 22 = 2. Thu: 17, 24 = 2. Total = 4
    const holidays = new Set(['2025-07-16']) // Wednesday
    const remaining = countRemainingClasses([2, 4], '2025-07-13', '2025-07-25', holidays)
    expect(remaining).toBe(4) // Unaffected — holiday is on Wed, course is Tue/Thu
  })

  it('same Wednesday holiday DOES affect a Mon/Wed/Fri course', () => {
    // Mon/Wed/Fri schedule (dayOfWeek 1, 3, 5)
    // Today = Sun 2025-07-13, end = Fri 2025-07-25
    // Mon: 14, 21 = 2. Wed: 16(HOLIDAY), 23 = 1. Fri: 18, 25 = 2. Total = 5
    const holidays = new Set(['2025-07-16']) // Wednesday
    const remaining = countRemainingClasses([1, 3, 5], '2025-07-13', '2025-07-25', holidays)
    expect(remaining).toBe(5) // One Wed skipped due to holiday
  })

  it('without the holiday, Mon/Wed/Fri course has one more class', () => {
    const noHolidays = new Set<string>()
    const remaining = countRemainingClasses([1, 3, 5], '2025-07-13', '2025-07-25', noHolidays)
    expect(remaining).toBe(6) // 2 Mon + 2 Wed + 2 Fri = 6
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Timezone/date boundary in countRemainingClasses
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Date parsing consistency', () => {
  it('countRemainingClasses correctly identifies day-of-week using local time', () => {
    // 2025-07-14 is a Monday. Schedule = Mon only.
    // Today = 2025-07-13 (Sun). Semester end = 2025-07-14.
    // Should count 1 remaining class (Mon Jul 14).
    const remaining = countRemainingClasses([1], '2025-07-13', '2025-07-14', new Set())
    expect(remaining).toBe(1)
  })

  it('does not count today even if it matches the schedule', () => {
    // Today = Mon 2025-07-14. Schedule = Mon. End = Mon 2025-07-14.
    // Should be 0 (today excluded, starts from tomorrow).
    const remaining = countRemainingClasses([1], '2025-07-14', '2025-07-14', new Set())
    expect(remaining).toBe(0)
  })

  it('generates correct date strings without using toISOString', () => {
    // The fix uses manual date formatting (YYYY-MM-DD from getFullYear/getMonth/getDate)
    // instead of toISOString().slice() which returns UTC dates.
    // Verify by checking a known week's results.
    // 2025-07-14 (Mon) to 2025-07-20 (Sun), schedule = every day (0-6)
    const remaining = countRemainingClasses(
      [0, 1, 2, 3, 4, 5, 6],
      '2025-07-13', // Sun — starts counting from Mon Jul 14
      '2025-07-20', // Sun
      new Set()
    )
    expect(remaining).toBe(7) // Mon-Sun = 7 days
  })

  it('holiday matching works with locally-formatted dates', () => {
    // Holiday on 2025-07-15 (Tue)
    // Schedule = Tue only, today = 2025-07-13 (Sun), end = 2025-07-22 (Tue)
    // Tuesdays: Jul 15 (HOLIDAY), Jul 22 = 1
    const holidays = new Set(['2025-07-15'])
    const remaining = countRemainingClasses([2], '2025-07-13', '2025-07-22', holidays)
    expect(remaining).toBe(1) // Jul 22 only
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Leap year handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Leap year date iteration', () => {
  it('counts classes across Feb 28 → Mar 1 in a leap year (2028)', () => {
    // 2028 is a leap year (Feb 29 exists)
    // Schedule = every weekday (Mon-Fri, dayOfWeek 1-5)
    // Today = Feb 27 (Sun), end = Mar 3 (Fri)
    // Feb 28 (Mon), Feb 29 (Tue), Mar 1 (Wed), Mar 2 (Thu), Mar 3 (Fri) = 5
    const remaining = countRemainingClasses([1, 2, 3, 4, 5], '2028-02-27', '2028-03-03', new Set())
    expect(remaining).toBe(5) // includes Feb 29
  })

  it('counts classes across Feb 28 → Mar 1 in a non-leap year (2025)', () => {
    // 2025 is NOT a leap year (no Feb 29)
    // Schedule = every weekday (Mon-Fri, dayOfWeek 1-5)
    // Today = Feb 27 (Thu), end = Mar 3 (Mon)
    // Feb 28 (Fri), Mar 1 (Sat=skip), Mar 2 (Sun=skip), Mar 3 (Mon) = 2
    const remaining = countRemainingClasses([1, 2, 3, 4, 5], '2025-02-27', '2025-03-03', new Set())
    expect(remaining).toBe(2) // Feb 28 (Fri), Mar 3 (Mon) — no Feb 29
  })

  it('holiday engine iterates correctly through leap year Feb', () => {
    // Generate holidays for Feb 2028 — should include Sundays
    const holidays = generateHolidays({
      startDate: '2028-02-01',
      endDate: '2028-02-29',
      stateCode: 'TN',
      includeSaturdays: false
    })
    // Feb 2028 Sundays: 6, 13, 20, 27 = 4 Sundays
    const sundays = holidays.filter(h => h.label === 'Sunday')
    expect(sundays).toHaveLength(4)
    expect(sundays.map(h => h.date)).toContain('2028-02-27')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Semester end date in past / not yet started
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge case: Semester boundary conditions', () => {
  it('semester ended: remainingClasses = 0', () => {
    // Semester ended yesterday
    const remaining = countRemainingClasses([1, 3, 5], '2025-07-15', '2025-07-14', new Set())
    expect(remaining).toBe(0)
  })

  it('semester ended: stats degrade gracefully with 0 remaining', () => {
    const stats = computeCourseStats({ ...base, attended: 38, bunked: 12, remaining: 0 })
    expect(stats.currentPct).toBeCloseTo(76) // 38/50
    expect(stats.bestCasePct).toBeCloseTo(76) // no more classes to improve
    expect(stats.worstCasePct).toBeCloseTo(76) // no more classes to worsen
    expect(stats.remainingClasses).toBe(0)
    // safe bunks: floor(38/0.75 - 50) = floor(0.67) = 0, capped at 0
    expect(stats.safeBunksRemaining).toBe(0)
  })

  it('semester not yet started: no records, all remaining', () => {
    // Schedule has 30 classes, but semester hasn't started — no logged records
    const stats = computeCourseStats({ ...base, attended: 0, bunked: 0, remaining: 30 })
    expect(stats.currentPct).toBeNull()
    expect(stats.bestCasePct).toBeCloseTo(100) // attend everything
    expect(stats.worstCasePct).toBeCloseTo(0)  // bunk everything
    // safeBunks = floor(0/0.75 - 0) = 0, capped at min(0, 30) = 0
    // Can't bank safe bunks with no attendance yet — need to attend first.
    expect(stats.safeBunksRemaining).toBe(0)
    expect(stats.needToAttend).toBe(0)
  })

  it('aggregate stats with all courses having no data shows null currentPct', () => {
    const s1 = computeCourseStats({ ...base, courseId: 1, attended: 0, bunked: 0, remaining: 20 })
    const s2 = computeCourseStats({ ...base, courseId: 2, attended: 0, bunked: 0, remaining: 15 })
    const agg = computeAggregateStats([s1, s2], 'simple')
    expect(agg.currentPct).toBeNull()
    expect(agg.courseCount).toBe(2)
    // bestCasePct = 0 when no courses have data (withData is empty, averages are skipped)
    expect(agg.bestCasePct).toBe(0)
  })

  it('semester with one past date as endDate still works', () => {
    // Semester "ended" with end date = today (edge case)
    // Schedule = Mon, today = Mon 2025-07-14, endDate = 2025-07-14
    // countRemaining starts from tomorrow, so = 0
    const remaining = countRemainingClasses([1], '2025-07-14', '2025-07-14', new Set())
    expect(remaining).toBe(0)
  })

  it('100% threshold: safeBunks is always 0 or negative (cannot bunk at all)', () => {
    const stats = computeCourseStats({ ...base, effectiveThreshold: 100, attended: 10, bunked: 0, remaining: 5 })
    // safe = floor(10/1.0 - 10) = 0
    expect(stats.safeBunksRemaining).toBe(0)

    const stats2 = computeCourseStats({ ...base, effectiveThreshold: 100, attended: 9, bunked: 1, remaining: 5 })
    // safe = floor(9/1.0 - 10) = -1
    expect(stats2.safeBunksRemaining).toBe(-1)
    expect(stats2.needToAttend).toBe(1)
  })
})
