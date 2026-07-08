import { useState } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import type { PageProps } from './types'
import { useDailyClasses } from '../hooks/useAppData'
import { bunkPreview } from '../lib/calculator'

export default function DailyLogPage(props: PageProps) {
  const { semester, courses, holidays, holidaySet, courseStats, records, logAttendance } = props
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [hoveringBunk, setHoveringBunk] = useState<number | null>(null)

  const dailyClasses = useDailyClasses(selectedDate, courses, records, holidaySet, holidays, courseStats)

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
      {!isHoliday && dailyClasses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">☀️</div>
          <div className="empty-state-title">No classes today</div>
          <div className="empty-state-desc">
            {courses.length === 0
              ? 'Add your timetable first from the Timetable page.'
              : 'No courses are scheduled on this day of the week.'}
          </div>
        </div>
      )}

      {!isHoliday && dailyClasses.length > 0 && (
        <div className="daily-class-list">
          {dailyClasses.map(dc => {
            const stats  = courseStats.find(s => s.courseId === dc.course.id)
            const preview = stats ? bunkPreview(stats, 1) : null
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
