import { ipcMain } from 'electron'
import { z } from 'zod'
import { getDb } from '../database'
import type { Course, CourseWithSchedule, WeeklyScheduleSlot } from '../../shared/types'

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#14b8a6','#ec4899','#84cc16']

const SlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  endTime: z.string().regex(/^\d{1,2}:\d{2}$/)
})

const CourseSchema = z.object({
  semesterId: z.number().int(),
  name: z.string().min(1),
  code: z.string().optional(),
  creditHours: z.number().positive().optional().default(1.0),
  thresholdOverride: z.number().min(0).max(100).nullable().optional(),
  color: z.string().optional(),
  schedule: z.array(SlotSchema).optional().default([])
})

const UpdateCourseSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).optional(),
  code: z.string().nullable().optional(),
  creditHours: z.number().positive().optional(),
  thresholdOverride: z.number().min(0).max(100).nullable().optional(),
  color: z.string().optional(),
  schedule: z.array(SlotSchema).optional()
})

function r2c(r: Record<string, unknown>): Course {
  return { id: r.id as number, semesterId: r.semester_id as number, name: r.name as string, code: r.code as string | null, creditHours: r.credit_hours as number, thresholdOverride: r.threshold_override as number | null, color: r.color as string }
}

function r2s(r: Record<string, unknown>): WeeklyScheduleSlot {
  return { id: r.id as number, courseId: r.course_id as number, dayOfWeek: r.day_of_week as number, startTime: r.start_time as string, endTime: r.end_time as string }
}

function getCWS(courseId: number): CourseWithSchedule {
  const db = getDb()
  const c = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId)
  const s = db.prepare('SELECT * FROM weekly_schedule WHERE course_id = ? ORDER BY day_of_week, start_time').all(courseId)
  return { ...r2c(c as Record<string, unknown>), schedule: (s as Record<string, unknown>[]).map(r2s) }
}

export function registerCourseHandlers(): void {
  ipcMain.handle('courses:list', (_e, rawSemesterId: unknown) => {
    try {
      const semesterId = z.number().int().parse(rawSemesterId)
      const db = getDb()
      return (db.prepare('SELECT * FROM courses WHERE semester_id = ? ORDER BY name').all(semesterId) as Record<string, unknown>[]).map(c => ({
        ...r2c(c),
        schedule: (db.prepare('SELECT * FROM weekly_schedule WHERE course_id = ? ORDER BY day_of_week, start_time').all(c.id as number) as Record<string, unknown>[]).map(r2s)
      }))
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('courses:create', (_e, payload) => {
    try {
      const db = getDb()
      const p = CourseSchema.parse(payload)
      const cnt = (db.prepare('SELECT COUNT(*) as n FROM courses WHERE semester_id = ?').get(p.semesterId) as { n: number }).n
      const color = p.color ?? COLORS[cnt % COLORS.length]
      const res = db.prepare(`INSERT INTO courses (semester_id, name, code, credit_hours, threshold_override, color) VALUES (?, ?, ?, ?, ?, ?)`).run(p.semesterId, p.name, p.code ?? null, p.creditHours, p.thresholdOverride ?? null, color)
      const courseId = res.lastInsertRowid as number
      const ins = db.prepare('INSERT INTO weekly_schedule (course_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)')
      for (const slot of p.schedule) ins.run(courseId, slot.dayOfWeek, slot.startTime, slot.endTime)
      return getCWS(courseId)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('courses:update', (_e, payload) => {
    try {
      const db = getDb()
      const p = UpdateCourseSchema.parse(payload)
      const { id, schedule, ...upd } = p
      const fields: string[] = []; const vals: unknown[] = []
      if (upd.name !== undefined) { fields.push('name = ?'); vals.push(upd.name) }
      if (upd.code !== undefined) { fields.push('code = ?'); vals.push(upd.code) }
      if (upd.creditHours !== undefined) { fields.push('credit_hours = ?'); vals.push(upd.creditHours) }
      if (upd.thresholdOverride !== undefined) { fields.push('threshold_override = ?'); vals.push(upd.thresholdOverride) }
      if (upd.color !== undefined) { fields.push('color = ?'); vals.push(upd.color) }
      if (fields.length) { vals.push(id); db.prepare(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`).run(...vals) }
      if (schedule !== undefined) {
        db.prepare('DELETE FROM weekly_schedule WHERE course_id = ?').run(id)
        const ins = db.prepare('INSERT INTO weekly_schedule (course_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)')
        for (const slot of schedule) ins.run(id, slot.dayOfWeek, slot.startTime, slot.endTime)
      }
      return getCWS(id)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('courses:delete', (_e, rawId: unknown) => {
    try {
      const id = z.number().int().parse(rawId)
      getDb().prepare('DELETE FROM courses WHERE id = ?').run(id)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('courses:bulkCreate', (_e, courses: unknown[]) => {
    try {
      const db = getDb()
      const results: CourseWithSchedule[] = []
      db.transaction(() => {
        for (const raw of courses) {
          const p = CourseSchema.parse(raw)
          const cnt = (db.prepare('SELECT COUNT(*) as n FROM courses WHERE semester_id = ?').get(p.semesterId) as { n: number }).n + results.filter(r => r.semesterId === p.semesterId).length
          const color = p.color ?? COLORS[cnt % COLORS.length]
          const res = db.prepare(`INSERT INTO courses (semester_id, name, code, credit_hours, threshold_override, color) VALUES (?, ?, ?, ?, ?, ?)`).run(p.semesterId, p.name, p.code ?? null, p.creditHours, p.thresholdOverride ?? null, color)
          const courseId = res.lastInsertRowid as number
          const ins = db.prepare('INSERT INTO weekly_schedule (course_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)')
          for (const slot of p.schedule) ins.run(courseId, slot.dayOfWeek, slot.startTime, slot.endTime)
          results.push(getCWS(courseId))
        }
      })()
      return results
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })
}
