import { useState, useEffect } from 'react'
import type { Semester } from '@shared/types'

const STATES = [
  { code: 'TN', name: 'Tamil Nadu' }, { code: 'MH', name: 'Maharashtra' },
  { code: 'KA', name: 'Karnataka' },  { code: 'KL', name: 'Kerala' },
  { code: 'AP', name: 'Andhra Pradesh' }, { code: 'TS', name: 'Telangana' },
  { code: 'WB', name: 'West Bengal' },{ code: 'DL', name: 'Delhi' },
  { code: 'GJ', name: 'Gujarat' },    { code: 'RJ', name: 'Rajasthan' },
  { code: 'UP', name: 'Uttar Pradesh' }, { code: 'BR', name: 'Bihar' },
  { code: 'MP', name: 'Madhya Pradesh' }, { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },     { code: 'HR', name: 'Haryana' },
  { code: 'GA', name: 'Goa' },        { code: 'OTHER', name: 'Other' },
]

interface Props {
  semester: Semester | null
  allSemesters: Semester[]
  onSemesterChange: () => Promise<void>
  switchSemester: (id: number) => Promise<void>
}

export default function SettingsPage({ semester, allSemesters, onSemesterChange, switchSemester }: Props) {
  const [tab, setTab] = useState<'semester'|'semesters'|'notifications'>('semester')

  return (
    <>
      <div>
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Manage semesters and attendance thresholds</div>
      </div>

      <div className="tabs">
        <button className={`tab${tab==='semester'?' active':''}`} onClick={() => setTab('semester')}>Current Semester</button>
        <button className={`tab${tab==='semesters'?' active':''}`} onClick={() => setTab('semesters')}>All Semesters</button>
        <button className={`tab${tab==='notifications'?' active':''}`} onClick={() => setTab('notifications')}>Notifications</button>
      </div>

      {tab === 'semester' && semester && (
        <SemesterEditor semester={semester} onSaved={onSemesterChange} />
      )}
      {tab === 'semester' && !semester && (
        <div className="card empty-state">
          <div className="empty-state-icon">⚙️</div>
          <div className="empty-state-title">No active semester</div>
          <div className="empty-state-desc">Create a semester first from the sidebar.</div>
        </div>
      )}

      {tab === 'semesters' && (
        <AllSemestersTab allSemesters={allSemesters} onChanged={onSemesterChange} currentId={semester?.id} switchSemester={switchSemester} />
      )}

      {tab === 'notifications' && (
        <NotificationsTab />
      )}
    </>
  )
}

// ─── Semester Editor ──────────────────────────────────────────────────────────

function SemesterEditor({ semester, onSaved }: { semester: Semester; onSaved: () => void }) {
  const [name, setName]       = useState(semester.name)
  const [start, setStart]     = useState(semester.startDate)
  const [end, setEnd]         = useState(semester.endDate)
  const [threshold, setThreshold] = useState(semester.threshold)
  const [stateCode, setStateCode] = useState(semester.stateCode)
  const [creditWeight, setCreditWeight] = useState(semester.useCreditWeight)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const save = async () => {
    setSaving(true)
    await window.attendGuard.updateSemester({ id: semester.id, name, startDate: start, endDate: end, threshold, stateCode, useCreditWeight: creditWeight })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:24, maxWidth:560}}>
      <div className="settings-section">
        <div className="settings-section-title">Semester Details</div>

        <div className="form-group">
          <label className="form-label">Semester Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">State / Region (for holidays)</label>
          <select className="select" value={stateCode} onChange={e => setStateCode(e.target.value)}>
            {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Attendance Threshold</div>
        <div style={{fontSize:13, color:'var(--text-secondary)', marginBottom:12}}>
          Minimum attendance required to pass. Can be overridden per course in the timetable.
        </div>
        <div className="threshold-slider-wrap">
          <input
            type="range" min="0" max="100" step="1"
            value={threshold}
            className="threshold-slider"
            style={{ '--pct': `${threshold}%` } as React.CSSProperties}
            onChange={e => setThreshold(parseFloat(e.target.value))}
          />
          <div className="threshold-value">{threshold}%</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Aggregate Method</div>
        <div className="toggle-wrap">
          <button className={`toggle${creditWeight?' on':''}`} onClick={() => setCreditWeight(v => !v)} aria-label="Toggle credit-weighted aggregate">
            <div className="toggle-knob" />
          </button>
          <div>
            <div style={{fontWeight:600, fontSize:14}}>{creditWeight ? 'Credit-Weighted' : 'Simple Average'}</div>
            <div style={{fontSize:12, color:'var(--text-muted)'}}>
              {creditWeight ? 'Courses with more credit hours have more weight in the overall %' : 'All courses contribute equally to the overall %'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-12 items-center">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Saving…' : '💾 Save Changes'}
        </button>
        {saved && <span style={{color:'var(--green)', fontWeight:600}}>✅ Saved!</span>}
      </div>
    </div>
  )
}

// ─── All Semesters List ───────────────────────────────────────────────────────

function AllSemestersTab({ allSemesters, onChanged, currentId, switchSemester }: { allSemesters: Semester[]; onChanged: () => void; currentId?: number; switchSemester: (id:number) => Promise<void> }) {
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleDelete = async (sem: Semester) => {
    if (!confirm(`Delete semester "${sem.name}"? All courses, attendance, and holidays for this semester will be deleted.`)) return
    setDeleting(sem.id)
    await window.attendGuard.deleteSemester(sem.id)
    setDeleting(null)
    await onChanged()
  }

  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:8}}>
      {allSemesters.length === 0 && (
        <div style={{textAlign:'center', padding:'32px', color:'var(--text-muted)'}}>No semesters yet.</div>
      )}
      {allSemesters.map(s => (
        <div key={s.id} style={{display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'var(--bg-elevated)', borderRadius:10, border: s.id===currentId ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)'}}>
          {s.id === currentId && <span style={{fontSize:10, padding:'2px 6px', background:'var(--indigo-bg)', color:'var(--indigo)', borderRadius:4, fontWeight:700}}>ACTIVE</span>}
          <div style={{flex:1}}>
            <div style={{fontWeight:600}}>{s.name}</div>
            <div style={{fontSize:12, color:'var(--text-muted)'}}>{s.startDate} → {s.endDate} · {s.threshold}% threshold</div>
          </div>
          {s.id !== currentId && (
            <button className="btn btn-secondary btn-sm" onClick={() => switchSemester(s.id)}>Switch</button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)} disabled={deleting===s.id}>
            {deleting===s.id ? '⏳' : '🗑️ Delete'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    window.attendGuard.getRemindersEnabled().then(setEnabled)
  }, [])

  const toggle = async () => {
    if (enabled === null) return
    const next = !enabled
    await window.attendGuard.setRemindersEnabled(next)
    setEnabled(next)
  }

  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:24, maxWidth:560}}>
      <div className="settings-section">
        <div className="settings-section-title">Class Reminders</div>
        <div style={{fontSize:13, color:'var(--text-secondary)', marginBottom:16}}>
          Get a desktop notification 15 minutes before each scheduled class.
          The reminder is skipped automatically if the class was already logged.
        </div>

        <div className="toggle-wrap">
          <button
            className={`toggle${enabled ? ' on' : ''}`}
            onClick={toggle}
            disabled={enabled === null}
            aria-label="Toggle class reminders"
          >
            <div className="toggle-knob" />
          </button>
          <div>
            <div style={{fontWeight:600, fontSize:14}}>
              {enabled === null ? 'Loading…' : enabled ? 'Reminders enabled' : 'Reminders disabled'}
            </div>
            <div style={{fontSize:12, color:'var(--text-muted)'}}>
              {enabled
                ? 'You will receive notifications 15 min before each class while the app is open.'
                : 'No reminders will be sent.'
              }
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title" style={{color:'var(--text-muted)', fontSize:12}}>Note</div>
        <div style={{fontSize:12, color:'var(--text-muted)', lineHeight:1.6}}>
          Notifications only fire while AttendGuard is running.
          For reminders when the app is closed, keep it running in the background via the system tray (coming in a future update).
        </div>
      </div>
    </div>
  )
}
