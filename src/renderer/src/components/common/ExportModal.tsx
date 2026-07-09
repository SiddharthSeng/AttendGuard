import { useState } from 'react'
import type { Semester, CourseStats, AttendanceRecord, CourseWithSchedule } from '@shared/types'
import { exportCSV, exportPDF } from '../../lib/exporter'

interface ExportModalProps {
  semester: Semester
  courseStats: CourseStats[]
  courses: CourseWithSchedule[]
  records: AttendanceRecord[]
  onClose: () => void
}

export function ExportModal({ semester, courseStats, courses, records, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [fromDate, setFromDate] = useState(semester.startDate)
  const [toDate, setToDate] = useState(semester.endDate)
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)

  const recordsInRange = records.filter(
    r => r.date >= (useCustomRange ? fromDate : semester.startDate)
      && r.date <= (useCustomRange ? toDate : semester.endDate)
  )

  async function handleExport() {
    setExporting(true)
    try {
      const opts = {
        semester,
        courseStats,
        courses,
        records,
        fromDate: useCustomRange ? fromDate : undefined,
        toDate:   useCustomRange ? toDate   : undefined
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
            <span className="ep-value">{courseStats.length}</span>
            <span className="ep-label">courses</span>
          </div>
          <div className="export-preview-stat">
            <span className="ep-value">{recordsInRange.length}</span>
            <span className="ep-label">log entries</span>
          </div>
          <div className="export-preview-stat">
            <span className={`ep-value ${courseStats.filter(s => s.currentPct !== null && s.currentPct < s.threshold).length > 0 ? 'danger' : 'safe'}`}>
              {courseStats.filter(s => s.currentPct !== null && s.currentPct < s.threshold).length}
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
