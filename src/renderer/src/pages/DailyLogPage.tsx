import { useState, useMemo } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import type { PageProps } from './types'
import { useDailyClasses } from '../hooks/useAppData'
import type { AttendanceRecord } from '@shared/types'

type StatusFilter = 'all' | AttendanceRecord['status']

export default function DailyLogPage(props: PageProps) {
  const { semester, courses, holidays, holidaySet, courseStats, records, logAttendance } = props
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [hoveringBunk, setHoveringBunk] = useState<number | null>(null)

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterCourse,  setFilterCourse]  = useState<string>('all')   // course id or 'all'
  const [filterStatus,  setFilterStatus]  = useState<StatusFilter>('all')
  const [searchText,    setSearchText]    = useState('')

  const dailyClasses = useDailyClasses(selectedDate, courses, records, holidaySet, holidays, courseStats)

  // Apply filters
  const filteredClasses = useMemo(() => {
    return dailyClasses.filter(dc => {
      if (filterCourse !== 'all' && dc.course.id !== Number(filterCourse)) return false
      if (filterStatus !== 'all') {
        const status = dc.record?.status ?? null
        if (filterStatus === 'attended'  && status !== 'attended')  return false
        if (filterStatus === 'bunked'    && status !== 'bunked')    return false
        if (filterStatus === 'cancelled' && status !== 'cancelled') return false
        if (filterStatus === 'holiday'   && status !== 'holiday')   return false
        // 'not-logged' pseudo-filter
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase()
        if (!dc.course.name.toLowerCase().includes(q) &&
            !(dc.course.code ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [dailyClasses, filterCourse, filterStatus, searchText])

  const hasFilters = filterCourse !== 'all' || filterStatus !== 'all' || searchText.trim() !== ''
  const clearFilters = () => { setFilterCourse('all'); setFilterStatus('all'); setSearchText('') }

  const prevDay = () => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
  const nextDay = () => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))

  const dateObj   = parseISO(selectedDate)
  const isHoliday = holidaySet.has(selectedDate)
  const holidayLabel = holidays.find(h => h.date === selectedDate)?.label

  if (!semester) return (
    <div className="empty-state">
      <div className="empty-state-icon">📝</div>
      <div className="empty-state-title">No semester active</div>
    </div>
  )

  return (
    <>
      {/* Date picker header */}
      <div className="daily-log-header">
        <button className="date-nav-btn" onClick={prevDay}>‹</button>
        <div className="date-display">{format(dateObj, 'EEEE, MMMM d yyyy')}</div>
        <button className="date-nav-btn" onClick={nextDay}>›</button>
        <input
          type="date"
          className="date-input"
          value={selectedDate}
          min={semester.startDate}
          max={semester.endDate}
          onChange={e => setSelectedDate(e.target.value)}
        />
        {selectedDate === format(new Date(), 'yyyy-MM-dd') && (
          <span className="chip">Today</span>
        )}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <span className="filter-label">Filter:</span>

        <input
          className="input"
          placeholder="Search course…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ minWidth: 140 }}
        />

        <select
          className="select"
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          style={{ minWidth: 140 }}
        >
          <option value="all">All courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          className="select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="attended">Attended</option>
          <option value="bunked">Bunked</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {hasFilters && (
          <button className="filter-clear" onClick={clearFilters}>✕ Clear</button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          {filteredClasses.length} / {dailyClasses.length} classes
        </span>
      </div>

      {/* Holiday banner */}
      {isHoliday && (
        <div className="holiday-banner">
          <span>🏖️</span>
          <div>
            <div style={{fontWeight:600}}>Holiday: {holidayLabel ?? 'Non-instructional day'}</div>
            <div style={{fontSize:12, opacity:0.8}}>No classes scheduled. Not counted in attendance.</div>
          </div>
        </div>
      )}

      {/* Classes */}
      {!isHoliday && filteredClasses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">{hasFilters ? '🔍' : '☀️'}</div>
          <div className="empty-state-title">
            {hasFilters ? 'No classes match the filter' : 'No classes today'}
          </div>
          <div className="empty-state-desc">
            {hasFilters
              ? <button className="filter-clear" style={{ margin: '8px auto', display: 'block' }} onClick={clearFilters}>Clear filters</button>
              : courses.length === 0
                ? 'Add your timetable first from the Timetable page.'
                : 'No courses are scheduled on this day of the week.'}
          </div>
        </div>
      )}

      {!isHoliday && filteredClasses.length > 0 && (
        <div className="daily-class-list">
          {filteredClasses.map(dc => {
            const stats   = courseStats.find(s => s.courseId === dc.course.id)
            const preview = dc.bunkPreviewPct
            const status  = dc.record?.status ?? null
            const cardClass = status ? `daily-class-card logged-${status}` : 'daily-class-card'

            return (
              <div key={`${dc.course.id}-${dc.slot.id}`} className={cardClass}>
                <div className="class-time">{dc.slot.startTime} – {dc.slot.endTime}</div>
                <div style={{ flex: 1 }}>
                  <div className="class-name" style={{ color: dc.course.color }}>{dc.course.name}</div>
                  {dc.course.code && <div className="class-code">{dc.course.code}</div>}
                </div>

                {/* Current % */}
                {stats?.currentPct !== null && stats && (
                  <div style={{fontSize:13, fontWeight:700, color:'var(--text-secondary)', minWidth:48, textAlign:'right'}}>
                    {Math.round(stats.currentPct!)}%
                  </div>
                )}

                {/* Action buttons */}
                <div className="action-buttons">
                  <button
                    className={`action-btn attend${status === 'attended' ? ' active' : ''}`}
                    onClick={() => logAttendance(dc.course.id, selectedDate, 'attended')}
                  >✓ Attended</button>

                  <div style={{ position: 'relative' }}>
                    <button
                      className={`action-btn bunk${status === 'bunked' ? ' active' : ''}`}
                      onClick={() => logAttendance(dc.course.id, selectedDate, 'bunked')}
                      onMouseEnter={() => setHoveringBunk(dc.course.id)}
                      onMouseLeave={() => setHoveringBunk(null)}
                    >✗ Bunk</button>
                    {hoveringBunk === dc.course.id && preview !== null && status !== 'bunked' && (
                      <div className="bunk-preview-tooltip">
                        <span style={{color:'var(--red)'}}>If bunked: {Math.round(preview)}%</span>
                        {stats && <span style={{color:'var(--text-muted)'}}> (was {Math.round(stats.currentPct ?? preview)}%)</span>}
                      </div>
                    )}
                  </div>

                  <button
                    className={`action-btn cancel${status === 'cancelled' ? ' active' : ''}`}
                    onClick={() => logAttendance(dc.course.id, selectedDate, 'cancelled')}
                  >— Cancel</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
