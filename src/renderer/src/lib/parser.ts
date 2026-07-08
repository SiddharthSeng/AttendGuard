import Papa from 'papaparse'
import * as XLSX from '@e965/xlsx'
import type { CreateCoursePayload, CreateHolidayPayload, HolidayType } from '@shared/types'

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6
}

export interface ParseError {
  row: number
  column: string
  value: string
  reason: string
}

export interface TimetableParseResult {
  courses: CreateCoursePayload[]
  errors: ParseError[]
}

export interface HolidayParseResult {
  holidays: Omit<CreateHolidayPayload, 'semesterId'>[]
  errors: ParseError[]
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function normalizeTime(raw: string): string | null {
  const t = raw.trim()
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1]), min = parseInt(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${h.toString().padStart(2, '0')}:${m[2]}`
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ─── Timetable parser ─────────────────────────────────────────────────────────

function parseTimetableRows(rows: Record<string, string>[]): TimetableParseResult {
  const errors: ParseError[] = []
  // Map: courseKey → { payload, slots, overlapTracker }
  const courseMap = new Map<string, { payload: CreateCoursePayload; slotKeys: Set<string> }>()

  // Track time-overlap per day: dayOfWeek → list of [start, end, courseKey]
  const daySlots: Record<number, Array<[number, number, string]>> = {}

  rows.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-indexed, +1 for header
    const rawCourse  = (row['Course'] ?? row['course'] ?? '').trim()
    const rawCode    = (row['Code'] ?? row['code'] ?? '').trim()
    const rawDay     = (row['Day'] ?? row['day'] ?? '').trim().toLowerCase()
    const rawStart   = (row['StartTime'] ?? row['start_time'] ?? row['Start'] ?? '').trim()
    const rawEnd     = (row['EndTime'] ?? row['end_time'] ?? row['End'] ?? '').trim()
    const rawCredits = (row['CreditHours'] ?? row['Credits'] ?? row['credit_hours'] ?? '').trim()

    if (!rawCourse) { errors.push({ row: rowNum, column: 'Course', value: rawCourse, reason: 'Course name is required' }); return }
    if (!rawDay)    { errors.push({ row: rowNum, column: 'Day', value: rawDay, reason: 'Day is required' }); return }
    if (!rawStart)  { errors.push({ row: rowNum, column: 'StartTime', value: rawStart, reason: 'StartTime is required' }); return }
    if (!rawEnd)    { errors.push({ row: rowNum, column: 'EndTime', value: rawEnd, reason: 'EndTime is required' }); return }

    const dayOfWeek = DAY_MAP[rawDay]
    if (dayOfWeek === undefined) {
      errors.push({ row: rowNum, column: 'Day', value: rawDay, reason: `Unrecognized day "${rawDay}". Use Monday/Mon etc.` }); return
    }

    const startTime = normalizeTime(rawStart)
    if (!startTime) { errors.push({ row: rowNum, column: 'StartTime', value: rawStart, reason: 'Invalid time format. Use HH:MM (e.g. 09:00)' }); return }

    const endTime = normalizeTime(rawEnd)
    if (!endTime) { errors.push({ row: rowNum, column: 'EndTime', value: rawEnd, reason: 'Invalid time format. Use HH:MM (e.g. 10:00)' }); return }

    if (timeToMins(startTime) >= timeToMins(endTime)) {
      errors.push({ row: rowNum, column: 'EndTime', value: rawEnd, reason: 'EndTime must be after StartTime' }); return
    }

    const credits = rawCredits ? parseFloat(rawCredits) : 1.0
    if (rawCredits && isNaN(credits)) {
      errors.push({ row: rowNum, column: 'CreditHours', value: rawCredits, reason: 'CreditHours must be a number' }); return
    }

    // Check for exact duplicate slot
    const slotKey = `${rawCourse}|${dayOfWeek}|${startTime}`
    const courseKey = rawCourse.toLowerCase()

    if (!courseMap.has(courseKey)) {
      courseMap.set(courseKey, {
        payload: { semesterId: 0, name: rawCourse, code: rawCode || undefined, creditHours: credits, schedule: [] },
        slotKeys: new Set()
      })
    }
    const entry = courseMap.get(courseKey)!

    if (entry.slotKeys.has(slotKey)) {
      errors.push({ row: rowNum, column: 'StartTime', value: rawStart, reason: `Duplicate slot: ${rawCourse} on this day at ${startTime}` }); return
    }
    entry.slotKeys.add(slotKey)

    // Check for time overlap with OTHER courses on same day
    if (!daySlots[dayOfWeek]) daySlots[dayOfWeek] = []
    const startMins = timeToMins(startTime)
    const endMins   = timeToMins(endTime)
    for (const [es, ee, ek] of daySlots[dayOfWeek]) {
      if (ek !== courseKey && startMins < ee && endMins > es) {
        const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === dayOfWeek && k.length > 3) ?? rawDay
        errors.push({ row: rowNum, column: 'StartTime', value: rawStart, reason: `Time overlap on ${dayName}: ${rawCourse} (${startTime}-${endTime}) overlaps with another course` })
        return
      }
    }
    daySlots[dayOfWeek].push([startMins, endMins, courseKey])

    entry.payload.schedule!.push({ dayOfWeek, startTime, endTime })
  })

  return { courses: [...courseMap.values()].map(e => e.payload), errors }
}

export function parseTimetableCSV(csvText: string): TimetableParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  if (!result.data.length) return { courses: [], errors: [{ row: 1, column: 'File', value: '', reason: 'File is empty or has no data rows' }] }

  const requiredCols = ['Course', 'Day']
  const headers = Object.keys(result.data[0])
  const missingCols = requiredCols.filter(c => !headers.some(h => h.toLowerCase() === c.toLowerCase()))
  if (missingCols.length) {
    return { courses: [], errors: [{ row: 1, column: missingCols.join(', '), value: '', reason: `Missing required columns: ${missingCols.join(', ')}` }] }
  }

  return parseTimetableRows(result.data)
}

export function parseTimetableXLSX(buffer: ArrayBuffer): TimetableParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  if (!rows.length) return { courses: [], errors: [{ row: 1, column: 'File', value: '', reason: 'Spreadsheet is empty' }] }
  return parseTimetableRows(rows)
}

// ─── Holiday parser ───────────────────────────────────────────────────────────

const VALID_TYPES = new Set(['public', 'break', 'university', 'custom'])

function parseHolidayRows(rows: Record<string, string>[]): HolidayParseResult {
  const errors: ParseError[] = []
  const holidays: Omit<CreateHolidayPayload, 'semesterId'>[] = []
  const seen = new Set<string>()

  rows.forEach((row, idx) => {
    const rowNum = idx + 2
    const rawDate  = (row['Date'] ?? row['date'] ?? '').trim()
    const rawLabel = (row['Label'] ?? row['label'] ?? row['Name'] ?? row['name'] ?? '').trim()
    const rawType  = (row['Type'] ?? row['type'] ?? 'public').trim().toLowerCase()

    if (!rawDate)  { errors.push({ row: rowNum, column: 'Date', value: rawDate, reason: 'Date is required' }); return }
    if (!rawLabel) { errors.push({ row: rowNum, column: 'Label', value: rawLabel, reason: 'Label is required' }); return }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      errors.push({ row: rowNum, column: 'Date', value: rawDate, reason: 'Date must be YYYY-MM-DD format' }); return
    }

    if (!VALID_TYPES.has(rawType)) {
      errors.push({ row: rowNum, column: 'Type', value: rawType, reason: `Type must be one of: public, break, university, custom` }); return
    }

    const key = `${rawDate}|${rawLabel}`
    if (seen.has(key)) { errors.push({ row: rowNum, column: 'Date', value: rawDate, reason: `Duplicate holiday: ${rawLabel} on ${rawDate}` }); return }
    seen.add(key)

    holidays.push({ date: rawDate, label: rawLabel, type: rawType as HolidayType })
  })

  return { holidays, errors }
}

export function parseHolidayCSV(csvText: string): HolidayParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  if (!result.data.length) return { holidays: [], errors: [{ row: 1, column: 'File', value: '', reason: 'File is empty' }] }
  return parseHolidayRows(result.data)
}
