/**
 * Tests for undo-last-action logic and DailyLog filter behaviour.
 * These are pure-logic tests over the state transitions that App.tsx and
 * DailyLogPage.tsx implement — no React renderer needed.
 */
import { describe, it, expect, vi } from 'vitest'
import type { AttendanceRecord, CourseWithSchedule } from '@shared/types'

// ─── Undo helpers ──────────────────────────────────────────────────────────────

/**
 * Simulates what logAttendanceWithUndo in App.tsx does:
 * Looks up the previous record, applies new status, returns undo thunk.
 */
function simulateLogWithUndo(
  records: AttendanceRecord[],
  courseId: number,
  date: string,
  newStatus: AttendanceRecord['status'],
  applyFn: (courseId: number, date: string, status: AttendanceRecord['status']) => void,
  deleteFn: (courseId: number, date: string) => void
): () => void {
  const prev = records.find(r => r.courseId === courseId && r.date === date)

  // Apply the new status (simulates the IPC call + state refresh)
  applyFn(courseId, date, newStatus)

  // Return undo thunk
  if (prev) {
    return () => applyFn(courseId, date, prev.status)
  } else {
    return () => deleteFn(courseId, date)
  }
}

describe('Undo — revert to previous status', () => {
  it('undoing an "attended" logs that reverts to "bunked"', () => {
    const records: AttendanceRecord[] = [
      { id: 1, courseId: 10, date: '2025-09-01', status: 'bunked' }
    ]
    const apply = vi.fn()
    const del   = vi.fn()

    const undo = simulateLogWithUndo(records, 10, '2025-09-01', 'attended', apply, del)

    expect(apply).toHaveBeenCalledWith(10, '2025-09-01', 'attended')
    expect(apply).toHaveBeenCalledTimes(1)

    undo()
    expect(apply).toHaveBeenCalledWith(10, '2025-09-01', 'bunked')
    expect(apply).toHaveBeenCalledTimes(2)
    expect(del).not.toHaveBeenCalled()
  })

  it('undoing a first-ever log (no prior record) deletes the record', () => {
    const records: AttendanceRecord[] = [] // no prior record
    const apply = vi.fn()
    const del   = vi.fn()

    const undo = simulateLogWithUndo(records, 10, '2025-09-02', 'attended', apply, del)

    expect(apply).toHaveBeenCalledWith(10, '2025-09-02', 'attended')

    undo()
    expect(del).toHaveBeenCalledWith(10, '2025-09-02')
    // apply should NOT be called again for the undo
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('undoing "bunked" → "cancelled" reverts to bunked', () => {
    const records: AttendanceRecord[] = [
      { id: 2, courseId: 20, date: '2025-09-03', status: 'bunked' }
    ]
    const apply = vi.fn()
    const del   = vi.fn()

    const undo = simulateLogWithUndo(records, 20, '2025-09-03', 'cancelled', apply, del)
    undo()

    expect(apply).toHaveBeenNthCalledWith(2, 20, '2025-09-03', 'bunked')
  })

  it('undo is idempotent — calling twice uses the same stored prior state', () => {
    const records: AttendanceRecord[] = [
      { id: 3, courseId: 30, date: '2025-09-04', status: 'attended' }
    ]
    const apply = vi.fn()
    const del   = vi.fn()

    const undo = simulateLogWithUndo(records, 30, '2025-09-04', 'bunked', apply, del)
    undo()
    undo() // second call should still try the same prior status

    expect(apply).toHaveBeenNthCalledWith(2, 30, '2025-09-04', 'attended')
    expect(apply).toHaveBeenNthCalledWith(3, 30, '2025-09-04', 'attended')
  })
})

// ─── Filter helpers ────────────────────────────────────────────────────────────

interface MockDailyClass {
  course: { id: number; name: string; code: string | null }
  record: { status: AttendanceRecord['status'] } | null
}

function applyDailyLogFilter(
  classes: MockDailyClass[],
  filterCourse: string,       // 'all' or course id as string
  filterStatus: string,       // 'all' | 'attended' | 'bunked' | 'cancelled'
  searchText: string
): MockDailyClass[] {
  return classes.filter(dc => {
    if (filterCourse !== 'all' && dc.course.id !== Number(filterCourse)) return false
    if (filterStatus !== 'all') {
      const status = dc.record?.status ?? null
      if (status !== filterStatus) return false
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      if (!dc.course.name.toLowerCase().includes(q) &&
          !(dc.course.code ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })
}

const MOCK_CLASSES: MockDailyClass[] = [
  { course: { id: 1, name: 'Mathematics', code: 'MA101' }, record: { status: 'attended' } },
  { course: { id: 2, name: 'Physics',     code: 'PH101' }, record: { status: 'bunked'   } },
  { course: { id: 3, name: 'Chemistry',   code: 'CH101' }, record: null                   },
  { course: { id: 4, name: 'History',     code: null    }, record: { status: 'cancelled'} },
]

describe('Filter — Daily Log', () => {
  it('no filters returns all classes', () => {
    expect(applyDailyLogFilter(MOCK_CLASSES, 'all', 'all', '')).toHaveLength(4)
  })

  it('filter by course id returns only that course', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, '2', 'all', '')
    expect(result).toHaveLength(1)
    expect(result[0].course.name).toBe('Physics')
  })

  it('filter by status "attended" returns only attended classes', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'attended', '')
    expect(result).toHaveLength(1)
    expect(result[0].course.name).toBe('Mathematics')
  })

  it('filter by status "bunked" returns only bunked', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'bunked', '')
    expect(result).toHaveLength(1)
    expect(result[0].course.name).toBe('Physics')
  })

  it('filter by status excludes null-record (not logged) classes', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'attended', '')
    expect(result.some(c => c.course.name === 'Chemistry')).toBe(false)
  })

  it('text search matches course name (case-insensitive)', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'all', 'math')
    expect(result).toHaveLength(1)
    expect(result[0].course.name).toBe('Mathematics')
  })

  it('text search matches course code', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'all', 'PH101')
    expect(result).toHaveLength(1)
    expect(result[0].course.name).toBe('Physics')
  })

  it('text search with null code does not crash', () => {
    // History has null code — searching for an unrelated term
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'all', 'xyz')
    expect(result).toHaveLength(0)
  })

  it('combining course filter + status filter returns intersection', () => {
    // Course 2 (Physics) + bunked → exactly one result
    const result = applyDailyLogFilter(MOCK_CLASSES, '2', 'bunked', '')
    expect(result).toHaveLength(1)

    // Course 2 (Physics) + attended → zero (Physics was bunked)
    const empty = applyDailyLogFilter(MOCK_CLASSES, '2', 'attended', '')
    expect(empty).toHaveLength(0)
  })

  it('search that matches nothing returns empty array', () => {
    expect(applyDailyLogFilter(MOCK_CLASSES, 'all', 'all', 'zzznomatch')).toHaveLength(0)
  })

  it('whitespace-only search text is treated as empty (no filter)', () => {
    const result = applyDailyLogFilter(MOCK_CLASSES, 'all', 'all', '   ')
    expect(result).toHaveLength(4)
  })
})

// ─── Export filter helpers ─────────────────────────────────────────────────────

describe('Filter — Export records', () => {
  const records: AttendanceRecord[] = [
    { id: 1, courseId: 1, date: '2025-09-01', status: 'attended' },
    { id: 2, courseId: 1, date: '2025-09-02', status: 'bunked'   },
    { id: 3, courseId: 2, date: '2025-09-01', status: 'attended' },
    { id: 4, courseId: 2, date: '2025-09-03', status: 'cancelled'},
  ]

  function filterExportRecords(
    recs: AttendanceRecord[],
    from: string,
    to: string,
    courseId: string,
    status: string
  ): AttendanceRecord[] {
    return recs.filter(r => {
      if (r.date < from || r.date > to) return false
      if (courseId !== 'all' && r.courseId !== Number(courseId)) return false
      if (status   !== 'all' && r.status  !== status)            return false
      return true
    })
  }

  it('no filter returns all records in range', () => {
    const res = filterExportRecords(records, '2025-09-01', '2025-09-03', 'all', 'all')
    expect(res).toHaveLength(4)
  })

  it('date range trims records outside the window', () => {
    const res = filterExportRecords(records, '2025-09-01', '2025-09-01', 'all', 'all')
    expect(res).toHaveLength(2) // two courses on 09-01
  })

  it('course filter restricts to one course', () => {
    const res = filterExportRecords(records, '2025-09-01', '2025-09-03', '1', 'all')
    expect(res).toHaveLength(2)
    expect(res.every(r => r.courseId === 1)).toBe(true)
  })

  it('status filter keeps only matching status', () => {
    const res = filterExportRecords(records, '2025-09-01', '2025-09-03', 'all', 'attended')
    expect(res).toHaveLength(2)
    expect(res.every(r => r.status === 'attended')).toBe(true)
  })

  it('course + status combined narrows to single record', () => {
    const res = filterExportRecords(records, '2025-09-01', '2025-09-03', '1', 'bunked')
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe(2)
  })
})
