import { useState, useEffect } from 'react'
import { MemoryRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import type { Semester } from '@shared/types'
import { useSemester, useCourses, useHolidays, useAttendance } from './hooks/useAppData'
import { useToast } from './hooks/useToast'
import DashboardPage from './pages/DashboardPage'
import DailyLogPage  from './pages/DailyLogPage'
import TimetablePage from './pages/TimetablePage'
import HolidayPage   from './pages/HolidayPage'
import HeatmapPage   from './pages/HeatmapPage'
import SettingsPage  from './pages/SettingsPage'
import SetupModal    from './components/common/SetupModal'

// ── Theme persistence ────────────────────────────────────────────────────────
type Theme = 'dark' | 'light'

function getStoredTheme(): Theme {
  try { return (localStorage.getItem('ag-theme') as Theme) || 'dark' } catch { return 'dark' }
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '')
  try { localStorage.setItem('ag-theme', t) } catch { /* ignore */ }
}

// Apply immediately on module load (before first render) to avoid flash
applyTheme(getStoredTheme())

export default function App() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AppShell />
    </MemoryRouter>
  )
}

function AppShell() {
  const nav = useNavigate()
  const { semester, allSemesters, loading, refresh, switchSemester } = useSemester()
  const { courses, refresh: refreshCourses } = useCourses(semester?.id ?? null)
  const { holidays, holidaySet, autoCount, refresh: refreshHolidays } = useHolidays(semester?.id ?? null)
  const { courseStats, aggregateStats, records, logAttendance, refresh: refreshAttendance } = useAttendance(semester, courses, holidaySet)
  const { showToast, ToastContainer } = useToast()

  const [showSetup, setShowSetup] = useState(false)
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    if (!loading && !semester) setShowSetup(true)
  }, [loading, semester])

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const refreshAll = async () => {
    await refresh()
    await Promise.all([refreshCourses(), refreshHolidays(), refreshAttendance()])
  }

  // Undo-aware logAttendance: records previous state, shows toast
  const logAttendanceWithUndo = async (courseId: number, date: string, status: typeof records[0]['status']) => {
    const prevRecord = records.find(r => r.courseId === courseId && r.date === date)
    await logAttendance(courseId, date, status)

    const courseName = courses.find(c => c.id === courseId)?.name ?? 'Unknown'
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1)

    showToast({
      message: `${courseName} — ${statusLabel}`,
      onUndo: prevRecord
        ? async () => {
            await logAttendance(courseId, date, prevRecord.status)
          }
        : async () => {
            await window.attendGuard.deleteAttendanceRecord(courseId, date)
            await refreshAttendance()
          }
    })
  }

  const sharedProps = {
    semester, courses, holidays, holidaySet, autoCount,
    courseStats, aggregateStats, records,
    logAttendance: logAttendanceWithUndo,
    refreshAll, refreshCourses, refreshHolidays, refreshAttendance
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡️</div>
          AttendGuard
        </div>

        <NavLink to="/"          className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">📊</span> Dashboard</NavLink>
        <NavLink to="/log"       className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">✏️</span> Daily Log</NavLink>
        <NavLink to="/heatmap"   className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">🗓️</span> Heatmap</NavLink>
        <NavLink to="/timetable" className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">📅</span> Timetable</NavLink>
        <NavLink to="/holidays"  className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">🏖️</span> Holidays</NavLink>
        <NavLink to="/settings"  className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">⚙️</span> Settings</NavLink>

        <div className="sidebar-spacer" />

        {/* Theme toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{ margin: '4px 0' }}
        >
          {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
        </button>

        {allSemesters.length > 0 && (
          <select
            className="semester-picker"
            value={semester?.id ?? ''}
            onChange={e => switchSemester(Number(e.target.value))}
          >
            {allSemesters.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' ✓' : ''}</option>
            ))}
          </select>
        )}
        <button className="nav-item mt-8" onClick={() => setShowSetup(true)} style={{justifyContent:'flex-start'}}>
          <span className="nav-icon">➕</span> New Semester
        </button>
      </aside>

      <main className="main-content">
        {loading ? (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading…</div></div>
        ) : (
          <Routes>
            <Route path="/"          element={<DashboardPage  {...sharedProps} onGoHolidays={() => nav('/holidays')} />} />
            <Route path="/log"       element={<DailyLogPage   {...sharedProps} />} />
            <Route path="/heatmap"   element={<HeatmapPage    {...sharedProps} />} />
            <Route path="/timetable" element={<TimetablePage  {...sharedProps} />} />
            <Route path="/holidays"  element={<HolidayPage    {...sharedProps} />} />
            <Route path="/settings"  element={<SettingsPage   semester={semester} allSemesters={allSemesters} onSemesterChange={refresh} switchSemester={switchSemester} />} />
          </Routes>
        )}
      </main>

      {showSetup && (
        <SetupModal
          onClose={() => setShowSetup(false)}
          onCreated={async (sem: Semester) => {
            await window.attendGuard.setActiveSemester(sem.id)
            await window.attendGuard.autoGenerateHolidays(sem.id)
            await refreshAll()
            setShowSetup(false)
          }}
        />
      )}

      {/* Global toast container */}
      <ToastContainer />
    </div>
  )
}
