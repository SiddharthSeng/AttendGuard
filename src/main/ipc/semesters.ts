import { ipcMain } from 'electron'
import { z } from 'zod'
import { getDb } from '../database'
import type { Semester } from '../../shared/types'

const CreateSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  threshold: z.number().min(0).max(100),
  stateCode: z.string().min(2).max(3),
  useCreditWeight: z.boolean().optional().default(false)
})

const UpdateSemesterSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  threshold: z.number().min(0).max(100).optional(),
  stateCode: z.string().min(2).max(3).optional(),
  useCreditWeight: z.boolean().optional()
})

function row2sem(r: Record<string, unknown>): Semester {
  return {
    id: r.id as number,
    name: r.name as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    threshold: r.threshold as number,
    stateCode: r.state_code as string,
    isActive: (r.is_active as number) === 1,
    useCreditWeight: (r.use_credit_weight as number) === 1
  }
}

export function registerSemesterHandlers(): void {
  ipcMain.handle('semesters:list', () => {
    try {
      return (getDb().prepare('SELECT * FROM semesters ORDER BY id DESC').all() as Record<string, unknown>[]).map(row2sem)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('semesters:getActive', () => {
    try {
      const r = getDb().prepare('SELECT * FROM semesters WHERE is_active = 1').get()
      return r ? row2sem(r as Record<string, unknown>) : null
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('semesters:create', (_e, payload) => {
    try {
      const db = getDb()
      const p = CreateSchema.parse(payload)
      const res = db.prepare(
        `INSERT INTO semesters (name, start_date, end_date, threshold, state_code, use_credit_weight)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(p.name, p.startDate, p.endDate, p.threshold, p.stateCode, p.useCreditWeight ? 1 : 0)
      return row2sem(db.prepare('SELECT * FROM semesters WHERE id = ?').get(res.lastInsertRowid) as Record<string, unknown>)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('semesters:update', (_e, payload) => {
    try {
      const db = getDb()
      const p = UpdateSemesterSchema.parse(payload)
      const { id, ...upd } = p
      const fields: string[] = []
      const vals: unknown[] = []
      if (upd.name !== undefined) { fields.push('name = ?'); vals.push(upd.name) }
      if (upd.startDate !== undefined) { fields.push('start_date = ?'); vals.push(upd.startDate) }
      if (upd.endDate !== undefined) { fields.push('end_date = ?'); vals.push(upd.endDate) }
      if (upd.threshold !== undefined) { fields.push('threshold = ?'); vals.push(upd.threshold) }
      if (upd.stateCode !== undefined) { fields.push('state_code = ?'); vals.push(upd.stateCode) }
      if (upd.useCreditWeight !== undefined) { fields.push('use_credit_weight = ?'); vals.push(upd.useCreditWeight ? 1 : 0) }
      if (!fields.length) throw new Error('No fields to update')
      vals.push(id)
      db.prepare(`UPDATE semesters SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
      return row2sem(db.prepare('SELECT * FROM semesters WHERE id = ?').get(id) as Record<string, unknown>)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('semesters:delete', (_e, rawId: unknown) => {
    try {
      const id = z.number().int().parse(rawId)
      getDb().prepare('DELETE FROM semesters WHERE id = ?').run(id)
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  ipcMain.handle('semesters:setActive', (_e, rawId: unknown) => {
    try {
      const id = z.number().int().parse(rawId)
      const db = getDb()
      db.transaction(() => {
        db.prepare('UPDATE semesters SET is_active = 0').run()
        db.prepare('UPDATE semesters SET is_active = 1 WHERE id = ?').run(id)
      })()
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
  })
}
