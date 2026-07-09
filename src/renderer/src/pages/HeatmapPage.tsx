/**
 * HeatmapPage — wraps CalendarHeatmap, accessible via /heatmap route.
 */
import type { PageProps } from './types'
import { CalendarHeatmap } from '../components/Dashboard/CalendarHeatmap'

export default function HeatmapPage(props: PageProps) {
  return (
    <>
      <div>
        <div className="page-title">Attendance Heatmap</div>
        <div className="page-subtitle">Month-by-month view of your attendance patterns</div>
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <CalendarHeatmap
          semester={props.semester}
          courses={props.courses}
          records={props.records}
          holidaySet={props.holidaySet}
          holidays={props.holidays}
        />
      </div>
    </>
  )
}
