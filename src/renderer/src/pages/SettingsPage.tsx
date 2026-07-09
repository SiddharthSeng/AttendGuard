import { useState, useEffect } from 'react'
import { INDIAN_STATES, type Semester } from '@shared/types'

interface Props {
  semester: Semester | null
  allSemesters: Semester[]
  onSemesterChange: () => Promise<void>
  switchSemester: (id: number) => Promise<void>
}

export default function SettingsPage({ semester, allSemesters, onSemesterChange, switchSemester }: Props) {
  const [tab, setTab] = useState<'semester'|'semesters'|'notifications'|'backup'>('semester')

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
        <button className={`tab${tab==='backup'?' active':''}`} onClick={() => setTab('backup')}>Backup</button>
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

      {tab === 'backup' && (
        <BackupTab />
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
            {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
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

// ─── Backup Tab ───────────────────────────────────────────────────────────────

function BackupTab() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function flashMsg(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 5000)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const base64 = await window.attendGuard.exportBackup()
      const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const blob   = new Blob([bytes], { type: 'application/octet-stream' })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      const ts     = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `attendguard-backup-${ts}.db`
      a.click()
      URL.revokeObjectURL(url)
      flashMsg('✓ Backup downloaded successfully.', true)
    } catch (err) {
      flashMsg(`Export failed: ${String(err)}`, false)
    } finally {
      setExporting(false)
    }
  }

  // ── Import — shared logic for file picker and drop ────────────────────────
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite')) {
      flashMsg('Please select a .db or .sqlite backup file.', false)
      return
    }
    const ok = confirm(
      `Restore backup from "${file.name}"?\n\nThis will REPLACE all current data (semesters, courses, attendance) with the backup. The app will restart.\n\nThis cannot be undone.`
    )
    if (!ok) return

    setImporting(true)
    try {
      const buf    = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      await window.attendGuard.importBackup(base64)
      flashMsg('✓ Backup restored — restarting…', true)
    } catch (err) {
      flashMsg(`Restore failed: ${String(err)}`, false)
    } finally {
      setImporting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 580 }}>
      <div className="settings-section">
        <div className="settings-section-title">Backup & Restore</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          AttendGuard stores all data locally. Use these controls to protect against data loss
          or migrate to another device.
        </div>
      </div>

      <div className="backup-section">
        {/* Export */}
        <div className="backup-action-row">
          <div className="backup-action-icon">💾</div>
          <div className="backup-action-body">
            <div className="backup-action-title">Export Database Backup</div>
            <div className="backup-action-desc">
              Downloads a complete copy of your attendance database as a <code>.db</code> file.
              Keep it somewhere safe — this is your only recovery option.
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? '⏳ Exporting…' : '⬇ Download Backup'}
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="backup-action-row">
          <div className="backup-action-icon">📂</div>
          <div className="backup-action-body">
            <div className="backup-action-title">Restore from Backup</div>
            <div className="backup-action-desc">
              Select or drop a <code>.db</code> backup file. <strong>This replaces all current data</strong> and restarts the app.
            </div>

            <label
              className={`restore-drop-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".db,.sqlite"
                style={{ display: 'none' }}
                onChange={handleInputChange}
                disabled={importing}
              />
              {importing
                ? '⏳ Restoring…'
                : dragOver
                  ? '📂 Drop to restore'
                  : '📂 Drop backup file here, or click to browse'}
            </label>
          </div>
        </div>
      </div>

      {/* Status message */}
      {msg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)',
          color:      msg.ok ? 'var(--green)'    : 'var(--red)',
          border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`
        }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}
