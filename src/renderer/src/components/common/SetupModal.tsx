import { useState } from 'react'
import type { Semester } from '@shared/types'

const STATES = [
  { code: 'TN', name: 'Tamil Nadu' }, { code: 'MH', name: 'Maharashtra' },
  { code: 'KA', name: 'Karnataka' },  { code: 'KL', name: 'Kerala' },
  { code: 'AP', name: 'Andhra Pradesh' }, { code: 'TS', name: 'Telangana' },
  { code: 'WB', name: 'West Bengal' },{ code: 'DL', name: 'Delhi' },
  { code: 'GJ', name: 'Gujarat' },    { code: 'RJ', name: 'Rajasthan' },
  { code: 'UP', name: 'Uttar Pradesh' }, { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'GA', name: 'Goa' },        { code: 'OTHER', name: 'Other / National' },
]

interface Props {
  onClose: () => void
  onCreated: (sem: Semester) => void
}

export default function SetupModal({ onClose, onCreated }: Props) {
  const [name, setName]       = useState('Semester 1')
  const [start, setStart]     = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10) })
  const [end, setEnd]         = useState(() => { const d = new Date(); d.setMonth(d.getMonth()+5); d.setDate(0); return d.toISOString().slice(0,10) })
  const [threshold, setThreshold] = useState(75)
  const [stateCode, setStateCode] = useState('TN')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('Semester name is required'); return }
    if (!start || !end) { setError('Start and end dates are required'); return }
    if (start >= end) { setError('End date must be after start date'); return }
    setSaving(true); setError('')
    try {
      const sem = await window.attendGuard.createSemester({ name: name.trim(), startDate: start, endDate: end, threshold, stateCode })
      onCreated(sem)
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div style={{textAlign:'center', marginBottom:28}}>
          <div style={{fontSize:40, marginBottom:12}}>🛡️</div>
          <div className="modal-title" style={{textAlign:'center'}}>Welcome to AttendGuard</div>
          <div style={{fontSize:14, color:'var(--text-secondary)'}}>Set up your semester to get started</div>
        </div>

        {error && <div style={{color:'var(--red)', fontSize:13, marginBottom:16, padding:'10px 12px', background:'var(--red-bg)', borderRadius:8}}>{error}</div>}

        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          <div className="form-group">
            <label className="form-label">Semester Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fall 2025, Odd Sem 2025" />
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
            <label className="form-label">State / Region (for auto-holidays)</label>
            <select className="select" value={stateCode} onChange={e => setStateCode(e.target.value)}>
              {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Attendance Threshold ({threshold}%)</label>
            <div className="threshold-slider-wrap">
              <input
                type="range" min="0" max="100" step="1"
                value={threshold}
                className="threshold-slider"
                style={{ '--pct': `${threshold}%` } as React.CSSProperties}
                onChange={e => setThreshold(parseInt(e.target.value))}
              />
              <div className="threshold-value">{threshold}%</div>
            </div>
            <div style={{fontSize:12, color:'var(--text-muted)', marginTop:6}}>Most universities require 75%. Can be changed later in Settings.</div>
          </div>

          <div style={{display:'flex', gap:12, marginTop:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={handleCreate} disabled={saving}>
              {saving ? '⏳ Creating & generating holidays…' : '🎓 Create Semester'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
