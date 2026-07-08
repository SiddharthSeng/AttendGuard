import type { CourseStats } from '@shared/types'

interface Props { stats: CourseStats; threshold: number }

function getColor(pct: number | null, threshold: number) {
  if (pct === null) return 'var(--text-muted)'
  if (pct >= threshold + 5) return 'var(--green)'
  if (pct >= threshold)     return 'var(--amber)'
  return 'var(--red)'
}

export default function CourseCard({ stats, threshold }: Props) {
  const pct   = stats.currentPct
  const color = getColor(pct, threshold)
  const fillW = pct === null ? 0 : Math.min(100, pct)

  return (
    <div className="course-card" style={{ '--course-color': stats.color } as React.CSSProperties}>
      <div className="course-card-header">
        <div>
          <div className="course-name">{stats.courseName}</div>
          {stats.courseCode && <div className="course-code">{stats.courseCode}</div>}
        </div>
        <div className="course-pct-badge" style={{ color }}>
          {pct === null ? '—' : `${Math.round(pct)}%`}
        </div>
      </div>

      <div className="threshold-bar-wrap">
        <div className="threshold-bar-fill" style={{ width: `${fillW}%`, background: color }} />
      </div>

      <div className="course-stats-row">
        <div className="course-stat-box">
          <div className="course-stat-val" style={{ color: stats.safeBunksRemaining >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {stats.safeBunksRemaining >= 0 ? stats.safeBunksRemaining : `-${stats.needToAttend}`}
          </div>
          <div className="course-stat-lbl">{stats.safeBunksRemaining >= 0 ? 'safe skips' : 'must attend'}</div>
        </div>
        <div className="course-stat-box">
          <div className="course-stat-val">{stats.attendedSoFar}/{stats.heldSoFar}</div>
          <div className="course-stat-lbl">attended</div>
        </div>
        <div className="course-stat-box">
          <div className="course-stat-val">{stats.remainingClasses}</div>
          <div className="course-stat-lbl">remaining</div>
        </div>
      </div>

      {!stats.isDataAvailable && (
        <div style={{fontSize:11, color:'var(--text-muted)', marginTop:10, textAlign:'center'}}>
          No classes logged yet
        </div>
      )}
    </div>
  )
}
