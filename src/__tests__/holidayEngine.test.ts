import { describe, it, expect } from 'vitest'
import { generateHolidays, getOutOfRangeWarning } from '@shared/holidayEngine'

// ─── generateHolidays ─────────────────────────────────────────────────────────

describe('generateHolidays', () => {
  it('returns empty array for invalid range (start > end)', () => {
    const result = generateHolidays({
      startDate: '2025-06-01',
      endDate: '2025-01-01',
      stateCode: 'TN',
      includeSaturdays: false
    })
    expect(result).toHaveLength(0)
  })

  it('includes Sundays in results', () => {
    // Week of 2025-07-07 to 2025-07-13 has one Sunday: 2025-07-13
    const result = generateHolidays({
      startDate: '2025-07-07',
      endDate: '2025-07-13',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const sundays = result.filter(h => h.label === 'Sunday')
    expect(sundays.length).toBeGreaterThanOrEqual(1)
    expect(sundays[0].type).toBe('public')
  })

  it('includes Saturdays when includeSaturdays=true', () => {
    const result = generateHolidays({
      startDate: '2025-07-07',
      endDate: '2025-07-13',
      stateCode: 'TN',
      includeSaturdays: true
    })
    const saturdays = result.filter(h => h.label === 'Saturday')
    expect(saturdays.length).toBeGreaterThanOrEqual(1)
  })

  it('does NOT include Saturdays when includeSaturdays=false', () => {
    const result = generateHolidays({
      startDate: '2025-07-07',
      endDate: '2025-07-13',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const saturdays = result.filter(h => h.label === 'Saturday')
    expect(saturdays).toHaveLength(0)
  })

  it('includes Republic Day on Jan 26', () => {
    const result = generateHolidays({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const rd = result.find(h => h.label === 'Republic Day')
    expect(rd).toBeDefined()
    expect(rd!.date).toBe('2025-01-26')
    expect(rd!.type).toBe('public')
  })

  it('includes Independence Day on Aug 15', () => {
    const result = generateHolidays({
      startDate: '2025-08-01',
      endDate: '2025-08-31',
      stateCode: 'DL',
      includeSaturdays: false
    })
    const id = result.find(h => h.label === 'Independence Day')
    expect(id).toBeDefined()
    expect(id!.date).toBe('2025-08-15')
  })

  it('includes Gandhi Jayanti on Oct 2', () => {
    const result = generateHolidays({
      startDate: '2025-10-01',
      endDate: '2025-10-10',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const gj = result.find(h => h.label === 'Gandhi Jayanti')
    expect(gj).toBeDefined()
    expect(gj!.date).toBe('2025-10-02')
  })

  it('includes TN-specific Pongal (Jan 14) for TN state', () => {
    const result = generateHolidays({
      startDate: '2025-01-01',
      endDate: '2025-01-20',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const pongal = result.find(h => h.label === 'Pongal')
    expect(pongal).toBeDefined()
    expect(pongal!.date).toBe('2025-01-14')
  })

  it('does NOT include TN-specific Pongal for non-TN states', () => {
    const result = generateHolidays({
      startDate: '2025-01-01',
      endDate: '2025-01-20',
      stateCode: 'DL',
      includeSaturdays: false
    })
    const pongal = result.find(h => h.label === 'Pongal')
    expect(pongal).toBeUndefined()
  })

  it('includes KA-specific Kannada Rajyotsava on Nov 1', () => {
    const result = generateHolidays({
      startDate: '2025-10-25',
      endDate: '2025-11-05',
      stateCode: 'KA',
      includeSaturdays: false
    })
    const kr = result.find(h => h.label === 'Kannada Rajyotsava')
    expect(kr).toBeDefined()
    expect(kr!.date).toBe('2025-11-01')
  })

  it('does NOT include Kannada Rajyotsava for TN', () => {
    const result = generateHolidays({
      startDate: '2025-10-25',
      endDate: '2025-11-05',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const kr = result.find(h => h.label === 'Kannada Rajyotsava')
    expect(kr).toBeUndefined()
  })

  it('includes variable-date holidays from lookup (Diwali 2025)', () => {
    const result = generateHolidays({
      startDate: '2025-10-01',
      endDate: '2025-11-30',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const diwali = result.find(h => h.label === 'Diwali (Lakshmi Puja)')
    expect(diwali).toBeDefined()
    expect(diwali!.date).toBe('2025-10-20')
  })

  it('returns results sorted by date', () => {
    const result = generateHolidays({
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      stateCode: 'TN',
      includeSaturdays: false
    })
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true)
    }
  })

  it('has no duplicate dates with same label', () => {
    const result = generateHolidays({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      stateCode: 'MH',
      includeSaturdays: true
    })
    const keys = result.map(h => h.date)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('spans across year boundary correctly', () => {
    // Range: Dec 15, 2025 → Jan 31, 2026 (covers Christmas and Republic Day 2026)
    const result = generateHolidays({
      startDate: '2025-12-15',
      endDate: '2026-01-31',
      stateCode: 'TN',
      includeSaturdays: false
    })
    const christmas = result.find(h => h.label === 'Christmas Day')
    expect(christmas).toBeDefined()
    expect(christmas!.date).toBe('2025-12-25')
    const rdNext = result.find(h => h.label === 'Republic Day')
    expect(rdNext).toBeDefined()
    expect(rdNext!.date).toBe('2026-01-26')
  })
})

// ─── getOutOfRangeWarning ─────────────────────────────────────────────────────

describe('getOutOfRangeWarning', () => {
  it('returns null for years within supported range (2024-2030)', () => {
    const warn = getOutOfRangeWarning('2025-07-01', '2025-12-31')
    expect(warn).toBeNull()
  })

  it('returns null for range spanning two supported years', () => {
    const warn = getOutOfRangeWarning('2025-11-01', '2026-04-30')
    expect(warn).toBeNull()
  })

  it('returns warning string for year outside supported range', () => {
    const warn = getOutOfRangeWarning('2031-01-01', '2031-05-31')
    expect(warn).not.toBeNull()
    expect(warn).toContain('2031')
  })

  it('returns warning for partially out-of-range spans', () => {
    const warn = getOutOfRangeWarning('2030-09-01', '2031-02-28')
    expect(warn).not.toBeNull()
    expect(warn).toContain('2031')
  })
})
