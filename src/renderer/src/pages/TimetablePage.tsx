import { useState, useRef } from 'react'
import type { PageProps } from './types'
import type { CreateCoursePayload } from '@shared/types'
import { parseTimetableCSV, parseTimetableXLSX, type ParseError } from '../lib/parser'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage(props: PageProps) {
  const { semester, courses, refreshCourses, refreshAttendance, refreshHolidays } = props
  const [tab, setTab] = useState<'import' | 'manual'>('import')

  if (!semester) return (
    <div className="empty-state">
      <div className="empty-state-icon">📅</div>
      <div className="empty-state-title">No semester active</div>
    </div>
  )

  return (
    <>
      <div>
        <div className="page-title">Timetable</div>
        <div className="page-subtitle">Import or manually enter your weekly class schedule</div>
      </div>

      <div className="tabs">
        <button className={`tab${tab==='import'?' active':''}`} onClick={() => setTab('import')}>📥 Import File</button>
        <button className={`tab${tab==='manual'?' active':''}`} onClick={() => setTab('manual')}>✏️ Manual Entry</button>
      </div>

      {tab === 'import' && (
        <ImportTab semester={semester} onImported={async () => {
          await refreshCourses()
          await refreshHolidays()
          await refreshAttendance()
        }} />
      )}
      {tab === 'manual' && (
        <ManualTab semester={semester} onSaved={async () => {
          await refreshCourses()
          await refreshHolidays()
          await refreshAttendance()
        }} />
      )}

      {/* Existing courses */}
      {courses.length > 0 && (
        <div className="card">
          <div style={{fontWeight:600, marginBottom:16}}>Current Courses ({courses.length})</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {courses.map(c => (
              <div key={c.id} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-elevated)', borderRadius:8}}>
                <div style={{width:10, height:10, borderRadius:'50%', background:c.color, flexShrink:0}} />
                <div style={{flex:1}}>
                  <span style={{fontWeight:600}}>{c.name}</span>
                  {c.code && <span style={{color:'var(--text-muted)', fontSize:12, marginLeft:8}}>{c.code}</span>}
                </div>
                <div style={{fontSize:12, color:'var(--text-muted)'}}>
                  {c.schedule.map(s => `${DAYS[s.dayOfWeek].slice(0,3)} ${s.startTime}`).join(' · ')}
                </div>
                <button className="btn-icon" title="Delete course" onClick={async () => {
                  if (confirm(`Delete "${c.name}"? All attendance records for this course will also be deleted.`)) {
                    await window.attendGuard.deleteCourse(c.id)
                    await refreshCourses()
                    await refreshAttendance()
                  }
                }}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function ImportTab({ semester, onImported }: { semester: { id: number }; onImported: () => void }) {
  const [errors, setErrors]   = useState<ParseError[]>([])
  const [preview, setPreview] = useState<CreateCoursePayload[]>([])
  const [drag, setDrag]       = useState(false)
  const [status, setStatus]   = useState<'idle'|'loading'|'done'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setStatus('loading'); setErrors([]); setPreview([])
    const ext = file.name.split('.').pop()?.toLowerCase()
    let result

    if (ext === 'csv') {
      result = parseTimetableCSV(await file.text())
    } else if (ext === 'xlsx' || ext === 'xls') {
      result = parseTimetableXLSX(await file.arrayBuffer())
    } else {
      setErrors([{ row:0, column:'File', value: file.name, reason:'Unsupported format. Use .csv or .xlsx' }])
      setStatus('idle'); return
    }

    setErrors(result.errors)
    setPreview(result.courses)
    setStatus('idle')
  }

  async function handleImport() {
    if (!preview.length) return
    setStatus('loading')
    const payloads = preview.map(c => ({ ...c, semesterId: semester.id }))
    await window.attendGuard.bulkCreateCourses(payloads)
    setPreview([]); setErrors([])
    setStatus('done')
    onImported()
  }

  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:16}}>
      {/* Dropzone */}
      <div
        className={`dropzone${drag?' drag-over':''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f) }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dropzone-icon">📂</div>
        <div className="dropzone-text">Drop your timetable CSV or XLSX here, or click to browse</div>
        <div className="dropzone-hint">Required columns: Course, Day, StartTime, EndTime · Optional: Code, CreditHours</div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value='' }} />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="error-list">
          <div className="error-list-title">⚠️ {errors.length} error{errors.length!==1?'s':''} found — fix these before importing</div>
          {errors.map((e, i) => (
            <div key={i} className="error-item">
              <span className="error-row-num">Row {e.row}:</span>
              [{e.column}] {e.reason} {e.value ? `(got: "${e.value}")` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && errors.length === 0 && (
        <div>
          <div style={{fontWeight:600, marginBottom:12}}>Preview — {preview.length} courses to import</div>
          {preview.map((c, i) => (
            <div key={i} style={{padding:'8px 12px', background:'var(--bg-elevated)', borderRadius:8, marginBottom:6, fontSize:13}}>
              <strong>{c.name}</strong>{c.code ? ` (${c.code})` : ''} — {c.schedule?.map(s => `${DAYS[s.dayOfWeek].slice(0,3)} ${s.startTime}-${s.endTime}`).join(', ')}
            </div>
          ))}
          <div style={{display:'flex', gap:12, marginTop:16}}>
            <button className="btn btn-primary" onClick={handleImport} disabled={status==='loading'}>
              {status==='loading' ? '⏳ Importing…' : `✅ Import ${preview.length} courses`}
            </button>
            <button className="btn btn-secondary" onClick={() => setPreview([])}>Cancel</button>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div style={{color:'var(--green)', fontWeight:600}}>✅ Courses imported successfully!</div>
      )}

      {/* Sample format */}
      <details style={{fontSize:12, color:'var(--text-muted)'}}>
        <summary style={{cursor:'pointer', userSelect:'none'}}>View sample CSV format</summary>
        <pre style={{marginTop:8, background:'var(--bg-elevated)', padding:12, borderRadius:8, overflow:'auto'}}>
{`Course,Code,Day,StartTime,EndTime,CreditHours
Mathematics,MA101,Monday,09:00,10:00,3
Mathematics,MA101,Wednesday,09:00,10:00,3
Physics,PH101,Tuesday,11:00,12:00,4
Physics,PH101,Friday,11:00,12:00,4`}
        </pre>
      </details>
    </div>
  )
}

// ─── Manual Tab ───────────────────────────────────────────────────────────────

function ManualTab({ semester, onSaved }: { semester: { id: number }; onSaved: () => void }) {
  const [name, setName]   = useState('')
  const [code, setCode]   = useState('')
  const [credits, setCredits] = useState('1')
  const [slots, setSlots] = useState<Array<{dayOfWeek:number; startTime:string; endTime:string}>>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone]   = useState(false)

  const addSlot = () => setSlots(s => [...s, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }])
  const removeSlot = (i: number) => setSlots(s => s.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!name.trim() || !slots.length) return
    setSaving(true)
    await window.attendGuard.createCourse({ semesterId: semester.id, name: name.trim(), code: code.trim() || undefined, creditHours: parseFloat(credits) || 1, schedule: slots })
    setSaving(false); setDone(true)
    setName(''); setCode(''); setCredits('1'); setSlots([])
    setTimeout(() => setDone(false), 2000)
    onSaved()
  }

  return (
    <div className="card" style={{display:'flex', flexDirection:'column', gap:16}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 140px 100px', gap:12}}>
        <div className="form-group">
          <label className="form-label">Course Name *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engineering Mathematics" />
        </div>
        <div className="form-group">
          <label className="form-label">Code</label>
          <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. MA101" />
        </div>
        <div className="form-group">
          <label className="form-label">Credit Hours</label>
          <input className="input" type="number" min="0.5" step="0.5" value={credits} onChange={e => setCredits(e.target.value)} />
        </div>
      </div>

      <div>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
          <span style={{fontWeight:600, fontSize:13}}>Weekly Schedule</span>
          <button className="btn btn-secondary btn-sm" onClick={addSlot}>+ Add slot</button>
        </div>
        {slots.map((slot, i) => (
          <div key={i} style={{display:'flex', gap:10, marginBottom:8, alignItems:'center'}}>
            <select className="select" style={{flex:1}} value={slot.dayOfWeek} onChange={e => setSlots(s => s.map((sl,j) => j===i ? {...sl, dayOfWeek:parseInt(e.target.value)} : sl))}>
              {DAYS.map((d,idx) => <option key={d} value={idx}>{d}</option>)}
            </select>
            <input className="input" style={{width:100}} type="time" value={slot.startTime} onChange={e => setSlots(s => s.map((sl,j) => j===i ? {...sl, startTime:e.target.value} : sl))} />
            <span style={{color:'var(--text-muted)'}}>–</span>
            <input className="input" style={{width:100}} type="time" value={slot.endTime} onChange={e => setSlots(s => s.map((sl,j) => j===i ? {...sl, endTime:e.target.value} : sl))} />
            <button className="btn-icon" onClick={() => removeSlot(i)}>✕</button>
          </div>
        ))}
        {!slots.length && <div style={{color:'var(--text-muted)', fontSize:13}}>No schedule slots yet — click "Add slot"</div>}
      </div>

      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim() || !slots.length}>
          {saving ? '⏳ Saving…' : '✅ Add Course'}
        </button>
        {done && <span style={{color:'var(--green)', fontWeight:600}}>Course added!</span>}
      </div>
    </div>
  )
}
