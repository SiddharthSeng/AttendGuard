/**
 * Class reminder engine — runs in the main process.
 * Fires a desktop Notification 15 minutes before each scheduled class,
 * but only if the class hasn't already been logged for that day.
 *
 * Design notes:
 * - Uses Electron's native Notification API (no extra packages).
 * - Timers are rescheduled each time scheduleReminders() is called
 *   (e.g., on app launch and semester change).
 * - Enabled/disabled via a stored pref in the renderer (sent over IPC).
 * - Safe to call multiple times — clears old timers first.
 */

import { Notification, ipcMain } from 'electron'
import { getDb } from './database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleRow {
  course_id: number
  course_name: string
  day_of_week: number   // 0=Sun…6=Sat
  start_time: string    // "HH:MM"
}

interface AttendedRow {
  course_id: number
  date: string
}

// ── State ─────────────────────────────────────────────────────────────────────

let remindersEnabled = true
const pendingTimers: ReturnType<typeof setTimeout>[] = []

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  // Use local date components — not toISOString() which returns UTC and can
  // disagree with the renderer's date-fns format() around midnight.
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd   = d.getDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function clearTimers(): void {

  while (pendingTimers.length) clearTimeout(pendingTimers.pop()!)
}

// ── Core scheduler ────────────────────────────────────────────────────────────

export function scheduleReminders(): void {
  clearTimers()
  if (!remindersEnabled) return

  const db = getDb()
  const today = todayStr()
  const dow   = new Date().getDay() // 0=Sun…6=Sat

  // Fetch all slots scheduled for today
  const slots = db
    .prepare(
      `SELECT ws.course_id, c.name AS course_name, ws.day_of_week, ws.start_time
       FROM weekly_schedule ws
       JOIN courses c ON c.id = ws.course_id
       JOIN semesters s ON s.id = c.semester_id
       WHERE s.is_active = 1
         AND ws.day_of_week = ?`
    )
    .all(dow) as ScheduleRow[]

  if (!slots.length) return

  // Fetch already-logged records for today
  const logged = db
    .prepare(
      `SELECT course_id, date FROM attendance_records
       WHERE date = ? AND status IN ('attended','bunked','cancelled')`
    )
    .all(today) as AttendedRow[]

  const loggedSet = new Set(logged.map(r => r.course_id))

  const now = Date.now()

  for (const slot of slots) {
    // Skip if already logged
    if (loggedSet.has(slot.course_id)) continue

    const [h, m] = slot.start_time.split(':').map(Number)
    const classDate = new Date()
    classDate.setHours(h, m, 0, 0)

    const fireAt = classDate.getTime() - 15 * 60 * 1000 // 15 min before
    const delay  = fireAt - now

    if (delay < 0) continue  // already past

    const timer = setTimeout(() => {
      // Double-check it still hasn't been logged
      const stillLogged = db
        .prepare(`SELECT 1 FROM attendance_records WHERE course_id = ? AND date = ?`)
        .get(slot.course_id, today)

      if (stillLogged) return

      if (Notification.isSupported()) {
        new Notification({
          title: 'AttendGuard — Class Reminder',
          body: `${slot.course_name} starts at ${slot.start_time}. Don't forget to log attendance!`,
          silent: false
        }).show()
      }
    }, delay)

    pendingTimers.push(timer)
  }
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

export function registerReminderHandlers(): void {
  ipcMain.handle('reminders:setEnabled', (_event, enabled: boolean) => {
    remindersEnabled = enabled
    if (enabled) {
      scheduleReminders()
    } else {
      clearTimers()
    }
    return { ok: true }
  })

  ipcMain.handle('reminders:getEnabled', () => remindersEnabled)

  // Called by renderer when semester changes or after a log action
  // so reminders don't fire for already-logged classes
  ipcMain.handle('reminders:reschedule', () => {
    scheduleReminders()
    return { ok: true }
  })
}

// ── Daily reschedule at midnight ──────────────────────────────────────────────

export function startMidnightReschedule(): void {
  function scheduleNext(): void {
    const now = new Date()
    const next = new Date(now)
    next.setDate(next.getDate() + 1)
    next.setHours(0, 0, 30, 0) // 00:00:30 next day
    const msUntilMidnight = next.getTime() - now.getTime()

    setTimeout(() => {
      scheduleReminders()
      scheduleNext() // re-arm for following day
    }, msUntilMidnight)
  }

  scheduleReminders() // fire immediately for today
  scheduleNext()
}
