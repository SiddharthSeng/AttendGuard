import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts'
import { format, eachWeekOfInterval, endOfWeek, parseISO, isBefore, isAfter } from 'date-fns'
import type { AttendanceRecord, CourseWithSchedule, Holiday, Semester, CourseStats } from '@shared/types'

interface TrendChartProps {
  semester: Semester
  courses: CourseWithSchedule[]
  records: AttendanceRecord[]
  holidays: Holiday[]
  courseStats: CourseStats[]
}

function buildWeeklyData(props: TrendChartProps) {
  const { semester, courses, records } = props
  const start = parseISO(semester.startDate)
  const end   = parseISO(semester.endDate)
  const today = new Date()

  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })

  return weeks.map(weekStart => {
    const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 })
    const cutoff    = isBefore(weekEnd, today) ? weekEnd : today
    const label     = format(weekStart, 'MMM d')
    const point: Record<string, unknown> = { week: label }


    for (const course of courses) {
      const recs = records.filter(r => {
        if (r.courseId !== course.id) return false
        const d = parseISO(r.date)
        return !isBefore(d, start) && !isAfter(d, cutoff)
      })
      const attended = recs.filter(r => r.status === 'attended').length
      const bunked   = recs.filter(r => r.status === 'bunked').length
      const held     = attended + bunked
      if (held > 0) point[course.name] = Math.round((attended / held) * 100)
    }

    return point
  }).filter(p => Object.keys(p).length > 1) // only weeks with data
}

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#14b8a6']

export default function TrendChart(props: TrendChartProps) {
  const data = buildWeeklyData(props)

  if (!data.length) return (
    <div style={{textAlign:'center', padding:'32px', color:'var(--text-muted)', fontSize:'13px'}}>
      No attendance data yet — log a few classes to see trends.
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8b90a8' }} />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#8b90a8' }} width={40} />
        <Tooltip
          contentStyle={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 }}
          formatter={(val: unknown) => [`${val}%`, '']}
          labelStyle={{ color: '#f0f2ff', fontWeight: 600, marginBottom: 4 }}
        />
        <ReferenceLine y={props.semester.threshold} stroke="rgba(239,68,68,0.5)" strokeDasharray="5 5" label={{ value: `${props.semester.threshold}%`, fill: '#ef4444', fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {props.courses.map((c, i) => (
          <Line key={c.id} type="monotone" dataKey={c.name} stroke={c.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
