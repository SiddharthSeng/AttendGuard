import { useState, useMemo } from 'react'
import type { Semester, CourseStats, AttendanceRecord, CourseWithSchedule } from '@shared/types'
import { exportCSV, exportPDF } from '../../lib/exporter'

interface ExportModalProps {
  semester: Semester
  courseStats: CourseStats[]
  courses: CourseWithSchedule[]
  records: AttendanceRecord[]
  onClose: () => void
}

type StatusFilter = 'all' | AttendanceRecord['status']

export function ExportModal({ semester, courseStats, courses, records, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [fromDate, setFromDate] = useState(semester.startDate)
  const [toDate, setToDate] = useState(semester.endDate)
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)

  const effectiveFrom = useCustomRange ? fromDate : semester.startDate
  const effectiveTo   = useCustomRange ? toDate   : semester.endDate

  // Apply filters to records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.date < effectiveFrom || r.date > effectiveTo) return false
      if (filterCourse !== 'all' && r.courseId !== Number(filterCourse)) return false
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      return true
    })
  }, [records, effectiveFrom, effectiveTo, filterCourse, filterStatus])

  // Filter courseStats to match course filter
  const filteredStats = useMemo(() =>
    filterCourse === 'all'
      ? courseStats
      : courseStats.filter(s => s.courseId === Number(filterCourse))
  , [courseStats, filterCourse])

  const filteredCourses = useMemo(() =>
    filterCourse === 'all'
      ? courses
      : courses.filter(c => c.id === Number(filterCourse))
  , [courses, filterCourse])

  const atRiskCount = filteredStats.filter(
    s => s.currentPct !== null && s.currentPct < s.threshold
  ).length

  async function handleExport() {
    setExporting(true)
    try {
      const opts = {
        semester,
        courseStats: filteredStats,
        courses: filteredCourses,
        records: filteredRecords,
        fromDate: effectiveFrom,
        toDate:   effectiveTo
      }
      if (format === 'pdf') exportPDF(opts)
      else exportCSV(opts)
      setDone(true)
      setTimeout(onClose, 1400)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card export-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Export Attendance Report</h2>
            <p className="modal-subtitle">{semester.name}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Format picker */}
        <div className="export-format-row">
          {(['pdf', 'csv'] as const).map(f => (
            <button
              key={f}
              className={`export-format-btn${format === f ? ' active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'pdf' ? '📄 PDF' : '📊 CSV'}
              <span className="export-format-desc">
                {f === 'pdf' ? 'Formatted report, printable' : 'Spreadsheet, for analysis'}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="export-section">
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <span className="filter-label">Filter:</span>

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
              <option value="attended">Attended only</option>
              <option value="bunked">Bunked only</option>
              <option value="cancelled">Cancelled only</option>
            </select>
          </div>
        </div>

        {/* Date range */}
        <div className="export-section">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={useCustomRange}
              onChange={e => setUseCustomRange(e.target.checked)}
            />
            <span>Custom date range</span>
          </label>

          {useCustomRange && (
            <div className="date-range-row">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={fromDate}
                  min={semester.startDate}
                  max={toDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </label>
              <span className="date-sep">→</span>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={semester.endDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Preview stats */}
        <div className="export-preview">
          <div className="export-preview-stat">
            <span className="ep-value">{filteredCourses.length}</span>
            <span className="ep-label">courses</span>
          </div>
          <div className="export-preview-stat">
            <span className="ep-value">{filteredRecords.length}</span>
            <span className="ep-label">log entries</span>
          </div>
          <div className="export-preview-stat">
            <span className={`ep-value ${atRiskCount > 0 ? 'danger' : 'safe'}`}>
              {atRiskCount}
            </span>
            <span className="ep-label">at-risk courses</span>
          </div>
        </div>

        {/* PDF note */}
        {format === 'pdf' && (
          <p className="export-note">
            📝 PDF includes a signature line — suitable for submitting to faculty or HOD.
          </p>
        )}

        {/* Action */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn-primary export-action-btn${done ? ' success' : ''}`}
            onClick={handleExport}
            disabled={exporting || done}
          >
            {done ? '✓ Downloaded!' : exporting ? 'Generating…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}
