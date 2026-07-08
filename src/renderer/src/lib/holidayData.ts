// Variable-date (lunar/officially-notified) Indian holidays by year and state.
// Fixed Gregorian holidays (Republic Day, Independence Day, Gandhi Jayanti, etc.)
// are computed programmatically in holidayEngine.ts — do NOT duplicate them here.

export const SUPPORTED_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

export interface HolidayEntry {
  date: string
  label: string
  type: string
}

type YearData = Record<string, HolidayEntry[]> // key = state code or 'ALL'

export const VARIABLE_HOLIDAYS: Record<string, YearData> = {
  '2024': {
    ALL: [
      { date: '2024-03-25', label: 'Holi', type: 'public' },
      { date: '2024-04-09', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2024-04-17', label: 'Ram Navami', type: 'public' },
      { date: '2024-04-23', label: 'Mahavir Jayanti', type: 'public' },
      { date: '2024-05-23', label: 'Buddha Purnima', type: 'public' },
      { date: '2024-06-17', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2024-07-17', label: 'Muharram', type: 'public' },
      { date: '2024-08-26', label: 'Janmashtami', type: 'public' },
      { date: '2024-09-16', label: 'Milad-un-Nabi', type: 'public' },
      { date: '2024-10-12', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2024-11-01', label: 'Diwali (Lakshmi Puja)', type: 'public' },
      { date: '2024-11-15', label: 'Guru Nanak Jayanti', type: 'public' },
    ],
    TN: [
      { date: '2024-01-15', label: 'Pongal', type: 'public' },
      { date: '2024-01-16', label: 'Mattu Pongal', type: 'public' },
      { date: '2024-01-17', label: 'Kaanum Pongal', type: 'public' },
      { date: '2024-10-12', label: 'Ayutha Puja', type: 'public' },
      { date: '2024-10-13', label: 'Vijayadasami', type: 'public' },
    ],
    MH: [
      { date: '2024-02-19', label: 'Chhatrapati Shivaji Maharaj Jayanti', type: 'public' },
      { date: '2024-09-07', label: 'Ganesh Chaturthi', type: 'public' },
    ],
    KA: [
      { date: '2024-01-15', label: 'Sankranti', type: 'public' },
      { date: '2024-03-25', label: 'Ugadi', type: 'public' },
      { date: '2024-09-07', label: 'Ganesh Chaturthi', type: 'public' },
    ],
    KL: [
      { date: '2024-08-31', label: 'Onam (Thiruvonam)', type: 'public' },
    ],
    AP: [{ date: '2024-04-09', label: 'Ugadi', type: 'public' }],
    TS: [{ date: '2024-04-09', label: 'Ugadi', type: 'public' }],
    WB: [
      { date: '2024-10-10', label: 'Durga Puja (Maha Navami)', type: 'public' },
      { date: '2024-10-11', label: 'Durga Puja (Vijaya Dashami)', type: 'public' },
    ],
  },
  '2025': {
    ALL: [
      { date: '2025-02-26', label: 'Maha Shivratri', type: 'public' },
      { date: '2025-03-14', label: 'Holi', type: 'public' },
      { date: '2025-03-30', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2025-04-06', label: 'Ram Navami', type: 'public' },
      { date: '2025-04-10', label: 'Mahavir Jayanti', type: 'public' },
      { date: '2025-04-18', label: 'Good Friday', type: 'public' },
      { date: '2025-05-12', label: 'Buddha Purnima', type: 'public' },
      { date: '2025-06-07', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2025-07-06', label: 'Muharram', type: 'public' },
      { date: '2025-08-16', label: 'Janmashtami', type: 'public' },
      { date: '2025-09-05', label: 'Milad-un-Nabi', type: 'public' },
      { date: '2025-10-02', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2025-10-20', label: 'Diwali (Lakshmi Puja)', type: 'public' },
      { date: '2025-11-05', label: 'Guru Nanak Jayanti', type: 'public' },
    ],
    TN: [
      { date: '2025-01-14', label: 'Pongal', type: 'public' },
      { date: '2025-01-15', label: 'Mattu Pongal', type: 'public' },
      { date: '2025-01-16', label: 'Kaanum Pongal', type: 'public' },
      { date: '2025-10-01', label: 'Ayutha Puja', type: 'public' },
      { date: '2025-10-02', label: 'Vijayadasami', type: 'public' },
    ],
    MH: [
      { date: '2025-02-19', label: 'Chhatrapati Shivaji Maharaj Jayanti', type: 'public' },
      { date: '2025-08-27', label: 'Ganesh Chaturthi', type: 'public' },
    ],
    KA: [
      { date: '2025-01-14', label: 'Sankranti', type: 'public' },
      { date: '2025-03-30', label: 'Ugadi', type: 'public' },
      { date: '2025-08-27', label: 'Ganesh Chaturthi', type: 'public' },
    ],
    KL: [{ date: '2025-09-04', label: 'Onam (Thiruvonam)', type: 'public' }],
    AP: [{ date: '2025-03-30', label: 'Ugadi', type: 'public' }],
    TS: [{ date: '2025-03-30', label: 'Ugadi', type: 'public' }],
    WB: [
      { date: '2025-09-29', label: 'Durga Puja (Maha Ashtami)', type: 'public' },
      { date: '2025-09-30', label: 'Durga Puja (Maha Navami)', type: 'public' },
      { date: '2025-10-01', label: 'Durga Puja (Vijaya Dashami)', type: 'public' },
    ],
  },
  '2026': {
    ALL: [
      { date: '2026-02-15', label: 'Maha Shivratri', type: 'public' },
      { date: '2026-03-03', label: 'Holi', type: 'public' },
      { date: '2026-03-20', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2026-05-27', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2026-06-25', label: 'Muharram', type: 'public' },
      { date: '2026-08-05', label: 'Janmashtami', type: 'public' },
      { date: '2026-09-02', label: 'Ganesh Chaturthi', type: 'public' },
      { date: '2026-10-19', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2026-11-07', label: 'Diwali (Lakshmi Puja)', type: 'public' },
      { date: '2026-11-25', label: 'Guru Nanak Jayanti', type: 'public' },
    ],
    TN: [
      { date: '2026-01-14', label: 'Pongal', type: 'public' },
      { date: '2026-01-15', label: 'Mattu Pongal', type: 'public' },
      { date: '2026-01-16', label: 'Kaanum Pongal', type: 'public' },
      { date: '2026-03-18', label: 'Ugadi / Tamil New Year', type: 'public' },
      { date: '2026-10-18', label: 'Ayutha Puja', type: 'public' },
      { date: '2026-10-19', label: 'Vijayadasami', type: 'public' },
    ],
    KL: [{ date: '2026-08-25', label: 'Onam (Thiruvonam)', type: 'public' }],
    AP: [{ date: '2026-03-19', label: 'Ugadi', type: 'public' }],
    TS: [{ date: '2026-03-19', label: 'Ugadi', type: 'public' }],
  },
  '2027': {
    ALL: [
      { date: '2027-02-20', label: 'Holi', type: 'public' },
      { date: '2027-03-09', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2027-05-16', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2027-06-15', label: 'Muharram', type: 'public' },
      { date: '2027-07-25', label: 'Janmashtami', type: 'public' },
      { date: '2027-09-22', label: 'Ganesh Chaturthi', type: 'public' },
      { date: '2027-10-08', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2027-10-27', label: 'Diwali (Lakshmi Puja)', type: 'public' },
      { date: '2027-11-15', label: 'Guru Nanak Jayanti', type: 'public' },
    ],
    TN: [
      { date: '2027-01-14', label: 'Pongal', type: 'public' },
      { date: '2027-01-15', label: 'Mattu Pongal', type: 'public' },
      { date: '2027-10-07', label: 'Ayutha Puja', type: 'public' },
      { date: '2027-10-08', label: 'Vijayadasami', type: 'public' },
    ],
  },
  '2028': {
    ALL: [
      { date: '2028-03-09', label: 'Holi', type: 'public' },
      { date: '2028-02-26', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2028-05-05', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2028-08-13', label: 'Janmashtami', type: 'public' },
      { date: '2028-09-26', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2028-11-14', label: 'Diwali (Lakshmi Puja)', type: 'public' },
    ],
    TN: [
      { date: '2028-01-15', label: 'Pongal', type: 'public' },
      { date: '2028-01-16', label: 'Mattu Pongal', type: 'public' },
    ],
  },
  '2029': {
    ALL: [
      { date: '2029-02-25', label: 'Holi', type: 'public' },
      { date: '2029-02-14', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2029-04-24', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2029-08-02', label: 'Janmashtami', type: 'public' },
      { date: '2029-10-14', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2029-11-02', label: 'Diwali (Lakshmi Puja)', type: 'public' },
    ],
    TN: [{ date: '2029-01-14', label: 'Pongal', type: 'public' }],
  },
  '2030': {
    ALL: [
      { date: '2030-03-16', label: 'Holi', type: 'public' },
      { date: '2030-02-03', label: 'Eid al-Fitr (Ramadan)', type: 'public' },
      { date: '2030-04-13', label: 'Eid al-Adha (Bakrid)', type: 'public' },
      { date: '2030-08-21', label: 'Janmashtami', type: 'public' },
      { date: '2030-10-04', label: 'Dussehra (Vijayadasami)', type: 'public' },
      { date: '2030-10-21', label: 'Diwali (Lakshmi Puja)', type: 'public' },
    ],
    TN: [{ date: '2030-01-14', label: 'Pongal', type: 'public' }],
  },
}
