/**
 * CalendarHeatmap — GitHub-contributions-style month grid.
 * Reads from attendance_records and holidays (already in memory via PageProps).
 * No new calculation logic — just aggregates and displays existing data.
 */
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parseISO } from 'date-fns'
import type { PageProps } from '../../pages/types'

type CellState = 'out-of-semester' | 'future' | 'holiday' | 'no-class' | 'full-attend' | 'partial-attend' | 'full-bunk' | 'partial-bunk' | 'mixed' | 'empty'

interface DayInfo {
  date: string
  state: CellState
  label: string
  attended: number
  bunked: number
  cancelled: number
  total: number
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props extends Pick<PageProps, 'semester' | 'courses' | 'records' | 'holidaySet' | 'holidays'> {}

export function CalendarHeatmap({ semester, courses, records, holidaySet, holidays }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    // Start on the month that contains today (or semester start if today is outside)
    const t = new Date()
    if (semester) {
      const s = parseISO(semester.startDate)
      const e = parseISO(semester.endDate)
      if (t < s) return s
      if (t > e) return e
    }
    return t
  })

  if (!semester) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📅</div>
        <div className="empty-state-title">No active semester</div>
      </div>
    )
  }

  // Build a set of days each course is scheduled
  const courseScheduleDays = new Map<number, Set<number>>()
  for (const c of courses) {
    courseScheduleDays.set(c.id, new Set(c.schedule.map(s => s.dayOfWeek)))
  }

  // Index records by date
  const recordsByDate = new Map<string, typeof records>()
  for (const r of records) {
    if (!recordsByDate.has(r.date)) recordsByDate.set(r.date, [])
    recordsByDate.get(r.date)!.push(r)
  }

  const semStart = semester.startDate
  const semEnd   = semester.endDate

  function classifyDay(dateStr: string): DayInfo {
    const dow = new Date(dateStr + 'T00:00:00').getDay()
    const recs = recordsByDate.get(dateStr) ?? []

    const isInSemester = dateStr >= semStart && dateStr <= semEnd
    const isFuture     = dateStr > today
    const isHol        = holidaySet.has(dateStr)
    const holLabel     = holidays.find(h => h.date === dateStr)?.label

    const attended  = recs.filter(r => r.status === 'attended').length
    const bunked    = recs.filter(r => r.status === 'bunked').length
    const cancelled = recs.filter(r => r.status === 'cancelled').length
    const total     = attended + bunked + cancelled

    // Which courses meet today?
    const scheduledCourses = courses.filter(c => courseScheduleDays.get(c.id)?.has(dow))

    let state: CellState
    let label: string

    if (!isInSemester) {
      state = 'out-of-semester'; label = 'Outside semester'
    } else if (isHol) {
      state = 'holiday'; label = holLabel ?? 'Holiday'
    } else if (isFuture) {
      state = 'future'; label = 'Upcoming'
    } else if (scheduledCourses.length === 0) {
      state = 'no-class'; label = 'No classes'
    } else if (total === 0) {
      state = 'no-class'; label = `${scheduledCourses.length} class${scheduledCourses.length > 1 ? 'es' : ''} — not logged`
    } else if (attended > 0 && bunked === 0) {
      state = attended >= scheduledCourses.length ? 'full-attend' : 'partial-attend'
      label = `${attended}/${scheduledCourses.length} attended`
    } else if (bunked > 0 && attended === 0) {
      state = bunked >= scheduledCourses.length ? 'full-bunk' : 'partial-bunk'
      label = `${bunked}/${scheduledCourses.length} bunked`
    } else {
      state = 'mixed'
      label = `${attended} attended, ${bunked} bunked`
    }

    return { date: dateStr, state, label, attended, bunked, cancelled, total }
  }

  // Build month grid
  const monthStart = startOfMonth(viewMonth)
  const monthEnd   = endOfMonth(viewMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingBlanks = getDay(monthStart) // 0=Sun

  const cells: DayInfo[] = []
  // Pad leading blanks
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ date: '', state: 'empty', label: '', attended: 0, bunked: 0, cancelled: 0, total: 0 })
  }
  for (const d of days) {
    cells.push(classifyDay(format(d, 'yyyy-MM-dd')))
  }

  // Navigation bounds
  const canGoBack = viewMonth > parseISO(semStart)
  const canGoNext = viewMonth < parseISO(semEnd)

  // Legend counts for the current month
  const monthStr = format(viewMonth, 'yyyy-MM')
  const monthCells = cells.filter(c => c.date.startsWith(monthStr))
  const attendDays  = monthCells.filter(c => c.state === 'full-attend' || c.state === 'partial-attend').length
  const bunkDays    = monthCells.filter(c => c.state === 'full-bunk'   || c.state === 'partial-bunk').length
  const holDays     = monthCells.filter(c => c.state === 'holiday').length

  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  return (
    <div className="heatmap-page">
      {/* Navigation */}
      <div className="heatmap-nav">
        <button
          className="date-nav-btn"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          disabled={!canGoBack}
        >‹</button>

        <div className="heatmap-month-title">{format(viewMonth, 'MMMM yyyy')}</div>

        <button
          className="date-nav-btn"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          disabled={!canGoNext}
        >›</button>

        <div className="heatmap-legend">
          <span><span className="legend-swatch" style={{ background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.3)' }} /> {attendDays} attended</span>
          <span><span className="legend-swatch" style={{ background: 'var(--red-bg)',   border: '1px solid rgba(239,68,68,0.3)'  }} /> {bunkDays} bunked</span>
          <span><span className="legend-swatch" style={{ background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,0.3)' }} /> {holDays} holidays</span>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="heatmap-grid">
        {DOW.map(d => <div key={d} className="heatmap-dow-header">{d}</div>)}

        {cells.map((cell, i) => {
          if (cell.state === 'empty') {
            return <div key={`e-${i}`} className="heatmap-cell empty" />
          }

          const dayNum = cell.date ? parseInt(cell.date.slice(8), 10) : 0
          const isToday = cell.date === today

          return (
            <div
              key={cell.date}
              className={`heatmap-cell ${cell.state}${isToday ? ' today-ring' : ''}`}
              style={isToday ? { outline: '2px solid var(--accent)', outlineOffset: '2px' } : undefined}
              onMouseEnter={() => setHoveredDate(cell.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <span className="heatmap-day-num">{dayNum}</span>

              {/* Dots for attended/bunked when mixed */}
              {(cell.state === 'mixed') && (
                <div className="heatmap-cell-dots">
                  {cell.attended > 0 && <div className="heatmap-dot" style={{ background: 'var(--green)' }} />}
                  {cell.bunked > 0   && <div className="heatmap-dot" style={{ background: 'var(--red)'   }} />}
                </div>
              )}

              {/* Tooltip */}
              {hoveredDate === cell.date && (
                <div className="heatmap-tooltip">
                  <strong>{format(parseISO(cell.date), 'EEE, MMM d')}</strong>
                  <br />{cell.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
