import { ipcMain } from 'electron'
import { z } from 'zod'
import { getDb } from '../database'
import type { AttendanceRecord } from '../../shared/types'

const LogSchema = z.object({
  courseId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['attended', 'bunked', 'cancelled', 'holiday'])
})

function r2ar(r: Record<string, unknown>): AttendanceRecord {
  return { id: r.id as number, courseId: r.course_id as number, date: r.date as string, status: r.status as AttendanceRecord['status'] }
}

export function registerAttendanceHandlers(): void {
  ipcMain.handle('attendance:log', (_e, payload) => {
    const db = getDb()
    const p = LogSchema.parse(payload)
    db.prepare(
      `INSERT INTO attendance_records (course_id, date, status) VALUES (?, ?, ?)
       ON CONFLICT(course_id, date) DO UPDATE SET status = excluded.status`
    ).run(p.courseId, p.date, p.status)
    return r2ar(db.prepare('SELECT * FROM attendance_records WHERE course_id = ? AND date = ?').get(p.courseId, p.date) as Record<string, unknown>)
  })

  ipcMain.handle('attendance:getRange', (_e, semesterId: number, from: string, to: string) => {
    const db = getDb()
    return (db.prepare(
      `SELECT ar.* FROM attendance_records ar
       JOIN courses c ON c.id = ar.course_id
       WHERE c.semester_id = ? AND ar.date >= ? AND ar.date <= ?
       ORDER BY ar.date, ar.course_id`
    ).all(semesterId, from, to) as Record<string, unknown>[]).map(r2ar)
  })

  ipcMain.handle('attendance:delete', (_e, courseId: number, date: string) => {
    getDb().prepare('DELETE FROM attendance_records WHERE course_id = ? AND date = ?').run(courseId, date)
  })
}
