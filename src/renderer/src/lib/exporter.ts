import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Semester, CourseStats, AttendanceRecord, CourseWithSchedule } from '@shared/types'

export interface ExportOptions {
  semester: Semester
  courseStats: CourseStats[]
  courses: CourseWithSchedule[]
  records: AttendanceRecord[]
  fromDate?: string
  toDate?: string
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportCSV(opts: ExportOptions): void {
  const { semester, courseStats, records, courses } = opts
  const from = opts.fromDate ?? semester.startDate
  const to   = opts.toDate   ?? semester.endDate

  const filtered = records.filter(r => r.date >= from && r.date <= to)

  // Summary sheet rows
  const summaryRows = courseStats.map(s => [
    s.courseName,
    s.courseCode ?? '',
    s.heldSoFar.toString(),
    s.attendedSoFar.toString(),
    s.heldSoFar - s.attendedSoFar > 0 ? (s.heldSoFar - s.attendedSoFar).toString() : '0',
    s.currentPct !== null ? `${Math.round(s.currentPct)}%` : '—',
    `${s.threshold}%`,
    s.safeBunksRemaining >= 0 ? s.safeBunksRemaining.toString() : '0',
    s.needToAttend > 0 ? s.needToAttend.toString() : '0',
    s.currentPct !== null && s.currentPct >= s.threshold ? 'SAFE' : 'AT RISK'
  ])

  const summaryCSV = [
    [`AttendGuard — Attendance Report`],
    [`Semester: ${semester.name}`],
    [`Period: ${from} to ${to}`],
    [`Threshold: ${semester.threshold}%`],
    [],
    ['COURSE SUMMARY'],
    ['Course','Code','Classes Held','Attended','Bunked','Current %','Threshold','Safe Skips Left','Must Attend','Status'],
    ...summaryRows,
    [],
    ['DETAILED ATTENDANCE LOG'],
    ['Date','Course','Code','Status']
  ]

  // Detailed log rows
  const courseMap = new Map(courses.map(c => [c.id, c]))
  const detailRows = filtered
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => {
      const c = courseMap.get(r.courseId)
      return [r.date, c?.name ?? '?', c?.code ?? '', r.status.toUpperCase()]
    })

  const allRows = [...summaryCSV, ...detailRows]
  const csv = allRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')

  downloadFile(
    `AttendGuard_${semester.name.replace(/\s+/g, '_')}_${from}_to_${to}.csv`,
    new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  )
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export function exportPDF(opts: ExportOptions): void {
  const { semester, courseStats, records, courses } = opts
  const from = opts.fromDate ?? semester.startDate
  const to   = opts.toDate   ?? semester.endDate
  const filtered = records.filter(r => r.date >= from && r.date <= to)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 17, 23)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('🛡 AttendGuard — Attendance Report', margin, 13)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 165, 190)
  doc.text(`Semester: ${semester.name}   |   Period: ${from} → ${to}   |   Threshold: ${semester.threshold}%`, margin, 21)

  // ── Aggregate summary band ───────────────────────────────────────────────────
  const withData = courseStats.filter(s => s.isDataAvailable)
  const avgPct = withData.length
    ? withData.reduce((sum, s) => sum + (s.currentPct ?? 0), 0) / withData.length
    : null

  const safeCount  = courseStats.filter(s => s.safeBunksRemaining >= 0).length
  const atRiskCount = courseStats.length - safeCount

  doc.setFillColor(30, 33, 48)
  doc.rect(margin, 32, pageW - margin * 2, 18, 'F')
  doc.setFontSize(9)
  doc.setTextColor(140, 144, 168)
  doc.text('OVERALL AVG', margin + 4, 39)
  doc.text('COURSES SAFE', margin + 60, 39)
  doc.text('AT RISK', margin + 110, 39)
  doc.text('GENERATED', margin + 150, 39)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(avgPct !== null && avgPct >= semester.threshold ? 34 : 239, avgPct !== null && avgPct >= semester.threshold ? 197 : 68, avgPct !== null && avgPct >= semester.threshold ? 94 : 68)
  doc.text(avgPct !== null ? `${Math.round(avgPct)}%` : '—', margin + 4, 46)
  doc.setTextColor(34, 197, 94)
  doc.text(String(safeCount), margin + 60, 46)
  doc.setTextColor(atRiskCount > 0 ? 239 : 34, atRiskCount > 0 ? 68 : 197, atRiskCount > 0 ? 68 : 94)
  doc.text(String(atRiskCount), margin + 110, 46)
  doc.setTextColor(160, 165, 190)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), margin + 150, 46)

  // ── Course summary table ─────────────────────────────────────────────────────
  let y = 56

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(99, 102, 241)
  doc.text('Course Summary', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Course', 'Code', 'Held', 'Attended', 'Bunked', 'Current %', 'Threshold', 'Status']],
    body: courseStats.map(s => [
      s.courseName,
      s.courseCode ?? '—',
      s.heldSoFar,
      s.attendedSoFar,
      s.heldSoFar - s.attendedSoFar,
      s.currentPct !== null ? `${Math.round(s.currentPct)}%` : '—',
      `${s.threshold}%`,
      s.currentPct !== null && s.currentPct >= s.threshold ? 'SAFE' : s.currentPct !== null ? 'AT RISK' : 'NO DATA'
    ]),
    headStyles: { fillColor: [15, 17, 23], textColor: [160, 165, 190], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [30, 33, 48] },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 18 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw)
        if (val === 'SAFE') data.cell.styles.textColor = [34, 197, 94]
        else if (val === 'AT RISK') data.cell.styles.textColor = [239, 68, 68]
        else data.cell.styles.textColor = [160, 165, 190]
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text(`Page ${data.pageNumber} | Generated by AttendGuard`, margin, doc.internal.pageSize.getHeight() - 8)
    }
  })

  // ── Detailed log table ───────────────────────────────────────────────────────
  const courseMap = new Map(courses.map(c => [c.id, c]))
  const detailRows = filtered
    .sort((a, b) => a.date.localeCompare(b.date) || a.courseId - b.courseId)
    .map(r => {
      const c = courseMap.get(r.courseId)
      return [r.date, c?.name ?? '?', c?.code ?? '—', r.status.charAt(0).toUpperCase() + r.status.slice(1)]
    })

  if (detailRows.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(99, 102, 241)
    doc.text('Detailed Attendance Log', margin, finalY)

    autoTable(doc, {
      startY: finalY + 2,
      margin: { left: margin, right: margin },
      head: [['Date', 'Course', 'Code', 'Status']],
      body: detailRows,
      headStyles: { fillColor: [15, 17, 23], textColor: [160, 165, 190], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 33, 48] },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 60 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw)
          if (val === 'Attended') data.cell.styles.textColor = [34, 197, 94]
          else if (val === 'Bunked') data.cell.styles.textColor = [239, 68, 68]
          else if (val === 'Cancelled') data.cell.styles.textColor = [245, 158, 11]
          else data.cell.styles.textColor = [160, 165, 190]
        }
      },
      didDrawPage: (data) => {
        doc.setFontSize(7)
        doc.setTextColor(180, 180, 180)
        doc.text(`Page ${data.pageNumber} | Generated by AttendGuard`, margin, doc.internal.pageSize.getHeight() - 8)
      }
    })
  }

  // ── Signature line ───────────────────────────────────────────────────────────
  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 200
  if (endY < 240) {
    doc.setDrawColor(200, 200, 210)
    doc.setLineWidth(0.3)
    doc.line(margin, endY + 16, margin + 70, endY + 16)
    doc.setFontSize(8)
    doc.setTextColor(140, 144, 168)
    doc.text('Student Signature', margin, endY + 21)
    doc.line(pageW - margin - 70, endY + 16, pageW - margin, endY + 16)
    doc.text('Faculty / HOD Signature', pageW - margin - 70, endY + 21)
  }

  doc.save(`AttendGuard_${semester.name.replace(/\s+/g, '_')}_${from}_to_${to}.pdf`)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
