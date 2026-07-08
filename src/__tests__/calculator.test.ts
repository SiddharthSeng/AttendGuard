import { describe, it, expect } from 'vitest'
import {
  computeCourseStats,
  computeAggregateStats,
  bunkPreview,
  countRemainingClasses,
  type RawCourseData
} from '@renderer/lib/calculator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const base: RawCourseData = {
  courseId: 1,
  courseName: 'Mathematics',
  courseCode: 'MA101',
  color: '#6366f1',
  creditHours: 3,
  effectiveThreshold: 75,
  attended: 0,
  bunked: 0,
  remaining: 0
}

// ─── computeCourseStats ───────────────────────────────────────────────────────

describe('computeCourseStats', () => {
  it('returns null currentPct when no classes held', () => {
    const s = computeCourseStats({ ...base, attended: 0, bunked: 0, remaining: 10 })
    expect(s.currentPct).toBeNull()
    expect(s.isDataAvailable).toBe(false)
    expect(s.heldSoFar).toBe(0)
  })

  it('computes 100% when all attended', () => {
    const s = computeCourseStats({ ...base, attended: 10, bunked: 0, remaining: 0 })
    expect(s.currentPct).toBeCloseTo(100)
    expect(s.bestCasePct).toBeCloseTo(100)
    expect(s.worstCasePct).toBeCloseTo(100)
  })

  it('computes 75% threshold safe bunks correctly — exactly at threshold', () => {
    // attended=75, held=100 → exactly 75%
    // safe to bunk: attended / (threshold/100) - held = 75/0.75 - 100 = 100-100 = 0
    const s = computeCourseStats({ ...base, attended: 75, bunked: 25, remaining: 20 })
    expect(s.currentPct).toBeCloseTo(75)
    expect(s.safeBunksRemaining).toBe(0)
    expect(s.needToAttend).toBe(0)
  })

  it('allows 5 safe bunks when well above threshold', () => {
    // attended=80, held=100 → 80%
    // raw = 80/0.75 - 100 = 106.67 - 100 = 6.67 → floor = 6, capped at remaining=5
    const s = computeCourseStats({ ...base, attended: 80, bunked: 20, remaining: 5 })
    expect(s.safeBunksRemaining).toBe(5) // capped at remaining
    expect(s.needToAttend).toBe(0)
  })

  it('shows negative safe bunks (deficit) when below threshold', () => {
    // attended=60, held=100 → 60%
    // raw = 60/0.75 - 100 = 80 - 100 = -20
    const s = computeCourseStats({ ...base, attended: 60, bunked: 40, remaining: 10 })
    expect(s.safeBunksRemaining).toBeLessThan(0)
    expect(s.needToAttend).toBeGreaterThan(0)
  })

  it('computes bestCase and worstCase projections correctly', () => {
    // attended=7, held=10, remaining=10
    // bestCase = (7+10)/(10+10) = 17/20 = 85%
    // worstCase = 7/(10+10) = 7/20 = 35%
    const s = computeCourseStats({ ...base, attended: 7, bunked: 3, remaining: 10 })
    expect(s.bestCasePct).toBeCloseTo(85)
    expect(s.worstCasePct).toBeCloseTo(35)
  })

  it('handles zero threshold gracefully', () => {
    const s = computeCourseStats({ ...base, effectiveThreshold: 0, attended: 0, bunked: 5, remaining: 3 })
    expect(s.safeBunksRemaining).toBe(3) // can bunk all remaining
  })

  it('cancelled classes not counted in held', () => {
    // The calculator only receives attended + bunked counts; cancelled is excluded upstream
    const s = computeCourseStats({ ...base, attended: 8, bunked: 2, remaining: 5 })
    expect(s.heldSoFar).toBe(10)
    expect(s.currentPct).toBeCloseTo(80)
  })
})

// ─── bunkPreview ──────────────────────────────────────────────────────────────

describe('bunkPreview', () => {
  it('returns 0% when no prior classes and you bunk 1 (0/1=0)', () => {
    // With 0 held so far and 1 bunk, the new percentage is 0/1 = 0%
    const preview = bunkPreview({ attendedSoFar: 0, heldSoFar: 0 })
    expect(preview).toBeCloseTo(0)
  })

  it('shows correct drop after bunking 1 class', () => {
    // attended=8, held=10 → 80%. After 1 bunk: 8/11 ≈ 72.7%
    const preview = bunkPreview({ attendedSoFar: 8, heldSoFar: 10 })
    expect(preview).toBeCloseTo(72.73, 1)
  })

  it('handles additionalBunks=2', () => {
    // attended=9, held=10. After 2 bunks: 9/12 = 75%
    const preview = bunkPreview({ attendedSoFar: 9, heldSoFar: 10 }, 2)
    expect(preview).toBeCloseTo(75, 1)
  })
})

// ─── computeAggregateStats ────────────────────────────────────────────────────

describe('computeAggregateStats', () => {
  it('returns null currentPct when all courses have no data', () => {
    const s1 = computeCourseStats({ ...base, courseId: 1, attended: 0, bunked: 0, remaining: 10 })
    const s2 = computeCourseStats({ ...base, courseId: 2, attended: 0, bunked: 0, remaining: 10 })
    const agg = computeAggregateStats([s1, s2], 'simple')
    expect(agg.currentPct).toBeNull()
    expect(agg.courseCount).toBe(2)
  })

  it('simple average: arithmetic mean of courses with data', () => {
    const s1 = computeCourseStats({ ...base, courseId: 1, attended: 8, bunked: 2, remaining: 5 }) // 80%
    const s2 = computeCourseStats({ ...base, courseId: 2, attended: 6, bunked: 4, remaining: 5 }) // 60%
    const agg = computeAggregateStats([s1, s2], 'simple')
    expect(agg.currentPct).toBeCloseTo(70) // (80+60)/2
    expect(agg.method).toBe('simple')
  })

  it('credit-weighted: weighted mean by creditHours', () => {
    const s1 = computeCourseStats({ ...base, courseId: 1, creditHours: 3, attended: 8, bunked: 2, remaining: 5 }) // 80%, weight 3
    const s2 = computeCourseStats({ ...base, courseId: 2, creditHours: 1, attended: 6, bunked: 4, remaining: 5 }) // 60%, weight 1
    const agg = computeAggregateStats([s1, s2], 'credit-weighted')
    // weighted = (80*3 + 60*1) / (3+1) = (240+60)/4 = 75
    expect(agg.currentPct).toBeCloseTo(75)
    expect(agg.method).toBe('credit-weighted')
  })

  it('safeBunksRemaining is the minimum across all courses (weakest link)', () => {
    const s1 = computeCourseStats({ ...base, courseId: 1, attended: 90, bunked: 10, remaining: 10 }) // many safe bunks
    const s2 = computeCourseStats({ ...base, courseId: 2, attended: 74, bunked: 26, remaining: 2 }) // negative
    const agg = computeAggregateStats([s1, s2], 'simple')
    expect(agg.safeBunksRemaining).toBe(Math.min(s1.safeBunksRemaining, s2.safeBunksRemaining))
  })

  it('handles empty course list', () => {
    const agg = computeAggregateStats([], 'simple')
    expect(agg.currentPct).toBeNull()
    expect(agg.courseCount).toBe(0)
    expect(agg.safeBunksRemaining).toBe(0)
  })
})

// ─── countRemainingClasses ────────────────────────────────────────────────────

describe('countRemainingClasses', () => {
  it('returns 0 when today is after semester end', () => {
    const count = countRemainingClasses([1, 3, 5], '2025-01-31', '2025-01-30', new Set())
    expect(count).toBe(0)
  })

  it('returns 0 when no days scheduled', () => {
    const count = countRemainingClasses([], '2025-01-01', '2025-01-31', new Set())
    expect(count).toBe(0)
  })

  it('skips holidays correctly', () => {
    // Monday schedule, 2 weeks starting 2025-07-14 (Mon), today=2025-07-13
    // Mondays: 2025-07-14, 2025-07-21
    // Holiday on 2025-07-14
    const holidays = new Set(['2025-07-14'])
    const count = countRemainingClasses([1], '2025-07-13', '2025-07-21', holidays)
    expect(count).toBe(1) // only 2025-07-21
  })

  it('does not count today (starts from tomorrow)', () => {
    // today = Monday 2025-07-14, semester ends 2025-07-14
    // schedule on Monday — but we only count from tomorrow, so 0
    const count = countRemainingClasses([1], '2025-07-14', '2025-07-14', new Set())
    expect(count).toBe(0)
  })

  it('counts multiple days per week correctly', () => {
    // Mon + Wed + Fri, today=2025-07-13 (Sun), end=2025-07-18 (Fri)
    // Mon=14, Wed=16, Fri=18 → 3 classes
    const count = countRemainingClasses([1, 3, 5], '2025-07-13', '2025-07-18', new Set())
    expect(count).toBe(3)
  })
})
