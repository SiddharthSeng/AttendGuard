import type { AggregateStats, Semester } from '@shared/types'

interface Props {
  stats: AggregateStats
  semester: Semester
}

function getStatusColor(pct: number | null, threshold: number): 'green' | 'amber' | 'red' {
  if (pct === null) return 'amber'
  if (pct >= threshold + 5) return 'green'
  if (pct >= threshold) return 'amber'
  return 'red'
}

const COLOR_MAP = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' }
const R = 48, CX = 60, CY = 60, STROKE = 8
const CIRC = 2 * Math.PI * R

export default function AggregateSummary({ stats, semester }: Props) {
  const pct    = stats.currentPct
  const color  = getStatusColor(pct, semester.threshold)
  const hex    = COLOR_MAP[color]
  const fillPct = pct ?? 0
  const dashArr = `${(fillPct / 100) * CIRC} ${CIRC}`

  return (
    <div className="aggregate-card">
      {/* Radial ring */}
      <div className="pct-ring-wrapper">
        <svg width={120} height={120} viewBox="0 0 120 120">
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
          {/* Progress */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={hex}
            strokeWidth={STROKE}
            strokeDasharray={dashArr}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease' }}
          />
        </svg>
        <div className="pct-ring-center">
          <div className="pct-value" style={{ color: hex }}>
            {pct === null ? '—' : `${Math.round(pct)}%`}
          </div>
          <div className="pct-label">overall</div>
        </div>
      </div>

      {/* Middle: safe bunks */}
      <div className="agg-stats">
        <div className="agg-stat-label">
          {stats.safeBunksRemaining >= 0 ? 'Safe to skip' : 'Must attend'}
        </div>
        <div className="safe-bunks-display">
          <div className={`safe-bunks-number ${color}`}>
            {Math.abs(stats.safeBunksRemaining >= 0 ? stats.safeBunksRemaining : stats.needToAttend)}
          </div>
          <div className="agg-stat-label" style={{fontSize:13}}>
            {stats.safeBunksRemaining >= 0 ? 'classes' : 'to reach threshold'}
          </div>
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)'}}>
          Threshold: <strong style={{color:'var(--text-secondary)'}}>{semester.threshold}%</strong>
          {' · '}{stats.courseCount} course{stats.courseCount !== 1 ? 's' : ''}
          {stats.method === 'credit-weighted' ? ' (weighted)' : ''}
        </div>
      </div>

      {/* Right: projections */}
      <div className="agg-projections">
        <div className="proj-row">
          <span className="proj-label">Best case</span>
          <span className="proj-value status-green">{Math.round(stats.bestCasePct)}%</span>
        </div>
        <div className="proj-row">
          <span className="proj-label">Worst case</span>
          <span className="proj-value status-red">{Math.round(stats.worstCasePct)}%</span>
        </div>
        <div className="proj-row">
          <span className="proj-label">Threshold</span>
          <span className="proj-value" style={{color:'var(--text-secondary)'}}>{semester.threshold}%</span>
        </div>
      </div>
    </div>
  )
}
