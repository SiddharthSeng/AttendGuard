// Re-export from the shared engine so renderer code using this path still works.
export { generateHolidays, getOutOfRangeWarning } from '@shared/holidayEngine'
export type { GeneratedHoliday, GenerateOptions } from '@shared/holidayEngine'
