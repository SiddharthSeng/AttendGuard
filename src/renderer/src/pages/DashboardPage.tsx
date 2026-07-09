import { useState } from 'react'
import type { PageProps } from './types'
import AggregateSummary from '../components/Dashboard/AggregateSummary'
import CourseCard from '../components/Dashboard/CourseCard'
import TrendChart from '../components/Dashboard/TrendChart'
import { useHolidayWarning } from '../hooks/useAppData'
import { ExportModal } from '../components/common/ExportModal'

interface DashboardPageProps extends PageProps {
  onGoHolidays: () => void
}

export default function DashboardPage(props: DashboardPageProps) {
  const { semester, courses, holidays, courseStats, aggregateStats, records, autoCount, onGoHolidays } = props
  const warning = useHolidayWarning(semester)
  const [showExport, setShowExport] = useState(false)

  if (!semester) return (
    <div className="empty-state">
      <div className="empty-state-icon">🎓</div>
      <div className="empty-state-title">No semester set up yet</div>
      <div className="empty-state-desc">Click "New Semester" in the sidebar to get started.</div>
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="page-title">{semester.name}</div>
          <div className="page-subtitle">{semester.startDate} → {semester.endDate}</div>
        </div>
        <div className="dashboard-actions">
          {/* Persistent holiday shortcut — always visible */}
          <button className="holiday-shortcut" onClick={onGoHolidays} title="Review and edit holidays">
            📅 {autoCount} auto-holiday{autoCount !== 1 ? 's' : ''} — Edit
          </button>
          {/* Export report button */}
          <button
            className="export-btn"
            onClick={() => setShowExport(true)}
            title="Export attendance report as PDF or CSV"
          >
            ⬇ Export Report
          </button>
        </div>
      </div>

      {/* Out-of-range warning for variable holidays */}
      {warning && (
        <div className="holiday-banner">
          <span>⚠️</span>
          <div>
            <div style={{fontWeight:600, marginBottom:4}}>Holiday data incomplete</div>
            <div style={{fontSize:12, opacity:0.8}}>{warning}</div>
          </div>
        </div>
      )}

      {/* Aggregate summary */}
      {aggregateStats && <AggregateSummary stats={aggregateStats} semester={semester} />}

      {/* Course grid */}
      {courseStats.length > 0 ? (
        <div className="course-grid">
          {courseStats.map(cs => (
            <CourseCard key={cs.courseId} stats={cs} threshold={cs.threshold} />
          ))}
        </div>
      ) : (
        <div className="card" style={{textAlign:'center', padding:'48px 32px'}}>
          <div style={{fontSize:36, marginBottom:12}}>📚</div>
          <div style={{fontWeight:600, marginBottom:8}}>No courses yet</div>
          <div style={{color:'var(--text-muted)', fontSize:13}}>Go to Timetable to import or add courses.</div>
        </div>
      )}

      {/* Trend chart */}
      {courses.length > 0 && records.length > 0 && (
        <div className="card chart-card">
          <div className="chart-title">Attendance Trend (weekly)</div>
          <TrendChart semester={semester} courses={courses} records={records} holidays={holidays} courseStats={courseStats} />
        </div>
      )}

      {/* Export modal */}
      {showExport && semester && (
        <ExportModal
          semester={semester}
          courseStats={courseStats}
          courses={courses}
          records={records}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  )
}

