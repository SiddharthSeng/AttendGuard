// Holiday generation engine - shared between main and renderer processes.
// Kept as plain TypeScript with no browser-specific imports.

export type HolidayType = 'public' | 'break' | 'university' | 'custom'

export interface GeneratedHoliday {
  date: string
  label: string
  type: HolidayType
}

export interface GenerateOptions {
  startDate: string
  endDate: string
  stateCode: string
  includeSaturdays: boolean
}

// Fixed Gregorian-date holidays — computable for any year
const FIXED_HOLIDAYS: Array<{
  month: number
  day: number
  label: string
  type: HolidayType
  states?: string[]
}> = [
  { month: 1,  day: 26, label: 'Republic Day', type: 'public' },
  { month: 8,  day: 15, label: 'Independence Day', type: 'public' },
  { month: 10, day: 2,  label: 'Gandhi Jayanti', type: 'public' },
  { month: 12, day: 25, label: 'Christmas Day', type: 'public' },
  { month: 11, day: 1,  label: 'Kannada Rajyotsava', type: 'public', states: ['KA'] },
  { month: 11, day: 1,  label: 'Kerala Piravi', type: 'public', states: ['KL'] },
  { month: 5,  day: 1,  label: 'May Day / Labour Day', type: 'public', states: ['TN','KA','KL','MH','WB','AP','TS'] },
  { month: 4,  day: 14, label: 'Tamil New Year (Puthandu)', type: 'public', states: ['TN'] },
  { month: 4,  day: 14, label: 'Dr. Ambedkar Jayanti', type: 'public', states: ['MH','DL','UP','RJ','GJ'] },
]

// Year-keyed variable-date holidays (lunar calendar, official notifications)
const VARIABLE_HOLIDAYS: Record<string, Record<string, Array<{date:string;label:string;type:string}>>> = {
  '2024': {
    ALL: [
      { date:'2024-03-25',label:'Holi',type:'public'},
      { date:'2024-04-09',label:'Eid al-Fitr (Ramadan)',type:'public'},
      { date:'2024-04-17',label:'Ram Navami',type:'public'},
      { date:'2024-04-23',label:'Mahavir Jayanti',type:'public'},
      { date:'2024-05-23',label:'Buddha Purnima',type:'public'},
      { date:'2024-06-17',label:'Eid al-Adha (Bakrid)',type:'public'},
      { date:'2024-07-17',label:'Muharram',type:'public'},
      { date:'2024-08-26',label:'Janmashtami',type:'public'},
      { date:'2024-09-16',label:'Milad-un-Nabi',type:'public'},
      { date:'2024-10-12',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2024-11-01',label:'Diwali (Lakshmi Puja)',type:'public'},
      { date:'2024-11-15',label:'Guru Nanak Jayanti',type:'public'},
    ],
    TN: [
      { date:'2024-01-15',label:'Pongal',type:'public'},
      { date:'2024-01-16',label:'Mattu Pongal',type:'public'},
      { date:'2024-01-17',label:'Kaanum Pongal',type:'public'},
      { date:'2024-10-12',label:'Ayutha Puja',type:'public'},
      { date:'2024-10-13',label:'Vijayadasami',type:'public'},
    ],
    MH: [
      { date:'2024-02-19',label:'Chhatrapati Shivaji Maharaj Jayanti',type:'public'},
      { date:'2024-09-07',label:'Ganesh Chaturthi',type:'public'},
    ],
    KA: [
      { date:'2024-01-15',label:'Sankranti',type:'public'},
      { date:'2024-03-25',label:'Ugadi',type:'public'},
      { date:'2024-09-07',label:'Ganesh Chaturthi',type:'public'},
    ],
    KL: [{ date:'2024-08-31',label:'Onam (Thiruvonam)',type:'public'}],
    AP: [{ date:'2024-04-09',label:'Ugadi',type:'public'}],
    TS: [{ date:'2024-04-09',label:'Ugadi',type:'public'}],
    WB: [
      { date:'2024-10-10',label:'Durga Puja (Maha Navami)',type:'public'},
      { date:'2024-10-11',label:'Durga Puja (Vijaya Dashami)',type:'public'},
    ],
  },
  '2025': {
    ALL: [
      { date:'2025-02-26',label:'Maha Shivratri',type:'public'},
      { date:'2025-03-14',label:'Holi',type:'public'},
      { date:'2025-03-30',label:'Eid al-Fitr (Ramadan)',type:'public'},
      { date:'2025-04-06',label:'Ram Navami',type:'public'},
      { date:'2025-04-10',label:'Mahavir Jayanti',type:'public'},
      { date:'2025-04-18',label:'Good Friday',type:'public'},
      { date:'2025-05-12',label:'Buddha Purnima',type:'public'},
      { date:'2025-06-07',label:'Eid al-Adha (Bakrid)',type:'public'},
      { date:'2025-07-06',label:'Muharram',type:'public'},
      { date:'2025-08-16',label:'Janmashtami',type:'public'},
      { date:'2025-09-05',label:'Milad-un-Nabi',type:'public'},
      { date:'2025-10-02',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2025-10-20',label:'Diwali (Lakshmi Puja)',type:'public'},
      { date:'2025-11-05',label:'Guru Nanak Jayanti',type:'public'},
    ],
    TN: [
      { date:'2025-01-14',label:'Pongal',type:'public'},
      { date:'2025-01-15',label:'Mattu Pongal',type:'public'},
      { date:'2025-01-16',label:'Kaanum Pongal',type:'public'},
      { date:'2025-10-01',label:'Ayutha Puja',type:'public'},
      { date:'2025-10-02',label:'Vijayadasami',type:'public'},
    ],
    MH: [
      { date:'2025-02-19',label:'Chhatrapati Shivaji Maharaj Jayanti',type:'public'},
      { date:'2025-08-27',label:'Ganesh Chaturthi',type:'public'},
    ],
    KA: [
      { date:'2025-01-14',label:'Sankranti',type:'public'},
      { date:'2025-03-30',label:'Ugadi',type:'public'},
      { date:'2025-08-27',label:'Ganesh Chaturthi',type:'public'},
    ],
    KL: [{ date:'2025-09-04',label:'Onam (Thiruvonam)',type:'public'}],
    AP: [{ date:'2025-03-30',label:'Ugadi',type:'public'}],
    TS: [{ date:'2025-03-30',label:'Ugadi',type:'public'}],
    WB: [
      { date:'2025-09-29',label:'Durga Puja (Maha Ashtami)',type:'public'},
      { date:'2025-09-30',label:'Durga Puja (Maha Navami)',type:'public'},
      { date:'2025-10-01',label:'Durga Puja (Vijaya Dashami)',type:'public'},
    ],
  },
  '2026': {
    ALL: [
      { date:'2026-02-15',label:'Maha Shivratri',type:'public'},
      { date:'2026-03-03',label:'Holi',type:'public'},
      { date:'2026-03-20',label:'Eid al-Fitr (Ramadan)',type:'public'},
      { date:'2026-05-27',label:'Eid al-Adha (Bakrid)',type:'public'},
      { date:'2026-06-25',label:'Muharram',type:'public'},
      { date:'2026-08-05',label:'Janmashtami',type:'public'},
      { date:'2026-09-02',label:'Ganesh Chaturthi',type:'public'},
      { date:'2026-10-19',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2026-11-07',label:'Diwali (Lakshmi Puja)',type:'public'},
      { date:'2026-11-25',label:'Guru Nanak Jayanti',type:'public'},
    ],
    TN: [
      { date:'2026-01-14',label:'Pongal',type:'public'},
      { date:'2026-01-15',label:'Mattu Pongal',type:'public'},
      { date:'2026-10-18',label:'Ayutha Puja',type:'public'},
      { date:'2026-10-19',label:'Vijayadasami',type:'public'},
    ],
    KL: [{ date:'2026-08-25',label:'Onam (Thiruvonam)',type:'public'}],
    AP: [{ date:'2026-03-19',label:'Ugadi',type:'public'}],
    TS: [{ date:'2026-03-19',label:'Ugadi',type:'public'}],
  },
  '2027': {
    ALL: [
      { date:'2027-02-20',label:'Holi',type:'public'},
      { date:'2027-03-09',label:'Eid al-Fitr (Ramadan)',type:'public'},
      { date:'2027-05-16',label:'Eid al-Adha (Bakrid)',type:'public'},
      { date:'2027-08-05',label:'Janmashtami',type:'public'},
      { date:'2027-10-08',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2027-10-27',label:'Diwali (Lakshmi Puja)',type:'public'},
      { date:'2027-11-15',label:'Guru Nanak Jayanti',type:'public'},
    ],
    TN: [{ date:'2027-01-14',label:'Pongal',type:'public'}],
  },
  '2028': {
    ALL: [
      { date:'2028-03-09',label:'Holi',type:'public'},
      { date:'2028-08-13',label:'Janmashtami',type:'public'},
      { date:'2028-09-26',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2028-11-14',label:'Diwali (Lakshmi Puja)',type:'public'},
    ],
    TN: [{ date:'2028-01-15',label:'Pongal',type:'public'}],
  },
  '2029': {
    ALL: [
      { date:'2029-02-25',label:'Holi',type:'public'},
      { date:'2029-08-02',label:'Janmashtami',type:'public'},
      { date:'2029-10-14',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2029-11-02',label:'Diwali (Lakshmi Puja)',type:'public'},
    ],
    TN: [{ date:'2029-01-14',label:'Pongal',type:'public'}],
  },
  '2030': {
    ALL: [
      { date:'2030-03-16',label:'Holi',type:'public'},
      { date:'2030-08-21',label:'Janmashtami',type:'public'},
      { date:'2030-10-04',label:'Dussehra (Vijayadasami)',type:'public'},
      { date:'2030-10-21',label:'Diwali (Lakshmi Puja)',type:'public'},
    ],
    TN: [{ date:'2030-01-14',label:'Pongal',type:'public'}],
  },
}

const SUPPORTED_YEARS = [2024,2025,2026,2027,2028,2029,2030]

function pad2(n: number) { return n.toString().padStart(2,'0') }

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 0
}

function isSaturday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 6
}

function eachDay(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const fin = new Date(end + 'T00:00:00')
  while (cur <= fin) {
    dates.push(cur.toISOString().slice(0,10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function generateHolidays(options: GenerateOptions): GeneratedHoliday[] {
  const { startDate, endDate, stateCode, includeSaturdays } = options
  if (startDate > endDate) return []

  const days = eachDay(startDate, endDate)
  const result: GeneratedHoliday[] = []
  const seen = new Set<string>()

  const add = (date: string, label: string, type: HolidayType) => {
    if (!seen.has(date)) { seen.add(date); result.push({ date, label, type }) }
  }

  // Gather years in range
  const yearsInRange = new Set(days.map(d => parseInt(d.slice(0,4))))

  // 1. Fixed Gregorian holidays (added first so they shadow same-day Sunday/Saturday)
  for (const year of yearsInRange) {
    for (const h of FIXED_HOLIDAYS) {
      if (h.states && !h.states.includes(stateCode)) continue
      const ds = dateStr(year, h.month, h.day)
      if (ds >= startDate && ds <= endDate) add(ds, h.label, h.type)
    }
  }

  // 2. Variable-date holidays from lookup table
  for (const year of yearsInRange) {
    if (!SUPPORTED_YEARS.includes(year)) continue
    const yd = VARIABLE_HOLIDAYS[year.toString()]
    if (!yd) continue
    const entries = [...(yd['ALL'] ?? []), ...(yd[stateCode] ?? [])]
    for (const e of entries) {
      if (e.date >= startDate && e.date <= endDate) add(e.date, e.label, e.type as HolidayType)
    }
  }

  // 3. Sundays — skip dates already marked as a named holiday
  for (const d of days) if (isSunday(d)) add(d, 'Sunday', 'public')

  // 4. Saturdays (only if no Saturday timetable) — same skip logic
  if (includeSaturdays) for (const d of days) if (isSaturday(d)) add(d, 'Saturday', 'public')

  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

export function getOutOfRangeWarning(startDate: string, endDate: string): string | null {
  const days = eachDay(startDate, endDate)
  const years = [...new Set(days.map(d => parseInt(d.slice(0,4))))]
  const missing = years.filter(y => !SUPPORTED_YEARS.includes(y))
  if (!missing.length) return null
  return `Variable-date festivals for ${missing.join(', ')} are not in the bundled data. Fixed holidays (Republic Day, Independence Day, etc.) have been added. Please add Diwali, Pongal, Eid, and other variable-date festivals manually for those years.`
}
