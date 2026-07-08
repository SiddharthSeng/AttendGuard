import type { Semester, CourseWithSchedule, Holiday, CourseStats, AggregateStats, AttendanceRecord } from '@shared/types'

export interface PageProps {
  semester: Semester | null
  courses: CourseWithSchedule[]
  holidays: Holiday[]
  holidaySet: Set<string>
  autoCount: number
  courseStats: CourseStats[]
  aggregateStats: AggregateStats | null
  records: AttendanceRecord[]
  logAttendance: (courseId: number, date: string, status: AttendanceRecord['status']) => Promise<void>
  refreshAll: () => Promise<void>
  refreshCourses: () => Promise<void>
  refreshHolidays: () => Promise<void>
  refreshAttendance: () => Promise<void>
}
