import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  FileSpreadsheet,
  FileText,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  Sun,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { LogForm, type LogValues } from './components/LogForm'
import { SessionForm, type SessionValues } from './components/SessionForm'
import { supabase } from './lib/supabase'
import type { Overview, WorkLog, WorkSession } from './lib/types'
import {
  addCalendarDays,
  calculateOverview,
  formatDate,
  formatDuration,
  getClockOutBreakMinutes,
  getEffectiveTargetHours,
  getElapsedMinutes,
  getWorkedMinutes,
  toLocalDateString,
  validateShift,
} from './utils/time'

type AppTab = 'logs' | 'overview' | 'settings'
type RunningTimer = { sessionId: string; startedAt: string; logDate: string; timeIn: string }
type DemoData = { sessions: WorkSession[]; logs: WorkLog[] }

const DEMO_KEY = 'minute-demo-workspace'
const TIMER_KEY = 'minute-running-timer'
const THEME_KEY = 'minute-theme'

function readDemo(): DemoData {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? JSON.parse(raw) as DemoData : { sessions: [], logs: [] }
  } catch {
    return { sessions: [], logs: [] }
  }
}

function sampleWorkspace(): DemoData {
  const today = toLocalDateString(new Date())
  const sessionId = 'minute-demo-session'
  const userId = 'minute-demo-user'
  const createdAt = new Date().toISOString()
  const session: WorkSession = {
    id: sessionId,
    user_id: userId,
    name: 'Product design internship',
    start_date: addCalendarDays(today, -18),
    target_hours: 320,
    target_end_date: null,
    required_hours_per_day: 8,
    default_break_minutes: 30,
    deduct_break: true,
    created_at: createdAt,
  }
  const logs: WorkLog[] = [
    { id: 'minute-demo-log-1', session_id: sessionId, user_id: userId, log_date: addCalendarDays(today, -2), time_in: '08:30:00', time_out: '18:00:00', break_minutes: 30, note: 'Design review and handoff', created_at: createdAt },
    { id: 'minute-demo-log-2', session_id: sessionId, user_id: userId, log_date: addCalendarDays(today, -1), time_in: '09:00:00', time_out: '15:00:00', break_minutes: 30, note: 'Research synthesis', created_at: createdAt },
    { id: 'minute-demo-log-3', session_id: sessionId, user_id: userId, log_date: today, time_in: '09:00:00', time_out: '17:30:00', break_minutes: 30, note: 'Prototype testing', created_at: createdAt },
  ]
  return { sessions: [session], logs }
}

function readTimer(): RunningTimer | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    return raw ? JSON.parse(raw) as RunningTimer : null
  } catch {
    return null
  }
}

function clockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function escapeCsv(value: string | number): string {
  const stringValue = String(value)
  return `"${stringValue.replaceAll('"', '""')}"`
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [isDemo, setIsDemo] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AppTab>('logs')
  const [loadingData, setLoadingData] = useState(false)
  const [loadedLogSessionIds, setLoadedLogSessionIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLog | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [coverageApplied, setCoverageApplied] = useState(false)
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(() => readTimer())
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light')

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null
  const sessionLogs = logs.filter((log) => log.session_id === activeSessionId)
  const isClockedIn = runningTimer?.sessionId === activeSessionId
  const loadingLogs = Boolean(user && activeSessionId && !loadedLogSessionIds.includes(activeSessionId))

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user ?? null)
        setLoadingData(Boolean(data.session))
        setAuthReady(true)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoadingData(Boolean(session))
      setError('')
      setIsDemo(false)
      setAuthReady(true)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    let mounted = true
    void supabase.from('sessions').select('*').order('created_at', { ascending: false }).then(({ data, error: queryError }) => {
      if (!mounted) return
      if (queryError) setError(queryError.message)
      else {
        const loadedSessions = (data ?? []) as WorkSession[]
        setSessions(loadedSessions)
        setActiveSessionId((current) => loadedSessions.some((session) => session.id === current) ? current : loadedSessions[0]?.id ?? null)
      }
      setLoadingData(false)
    })
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    if (!activeSessionId || isDemo || !user || !supabase) return
    let mounted = true
    void supabase.from('logs').select('*').eq('session_id', activeSessionId).order('log_date', { ascending: false }).then(({ data, error: queryError }) => {
      if (!mounted) return
      if (queryError) setError(queryError.message)
      else {
        const loadedLogs = (data ?? []) as WorkLog[]
        setLogs((current) => [...current.filter((log) => log.session_id !== activeSessionId), ...loadedLogs])
      }
      setLoadedLogSessionIds((current) => current.includes(activeSessionId) ? current : [...current, activeSessionId])
    })
    return () => { mounted = false }
  }, [activeSessionId, user, isDemo])

  useEffect(() => {
    if (!runningTimer) return
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [runningTimer])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  function persistDemo(nextSessions: WorkSession[], nextLogs: WorkLog[]) {
    setSessions(nextSessions)
    setLogs(nextLogs)
    localStorage.setItem(DEMO_KEY, JSON.stringify({ sessions: nextSessions, logs: nextLogs }))
  }

  async function handleAuth(mode: 'login' | 'signup', email: string, password: string) {
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        if (!data.session) setAuthMessage('Check your email for a confirmation link, then sign in.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (authFailure) {
      setAuthError(authFailure instanceof Error ? authFailure.message : 'Unable to sign in right now.')
    } finally {
      setAuthBusy(false)
    }
  }

  function startDemo() {
    let data = readDemo()
    if (!data.sessions.length) data = sampleWorkspace()
    persistDemo(data.sessions, data.logs)
    setActiveSessionId(data.sessions[0]?.id ?? null)
    setLoadingData(false)
    setIsDemo(true)
    setAuthError('')
    setAuthMessage('')
  }

  async function signOut() {
    if (isDemo) {
      setIsDemo(false)
      return
    }
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  async function saveSession(values: SessionValues, existing?: WorkSession) {
    setBusy(true)
    setError('')
    try {
      const userId = user?.id ?? 'minute-demo-user'
      let savedSession: WorkSession
      if (isDemo) {
        savedSession = {
          ...values,
          id: existing?.id ?? crypto.randomUUID(),
          user_id: userId,
          created_at: existing?.created_at ?? new Date().toISOString(),
        }
        const nextSessions = existing
          ? sessions.map((session) => session.id === existing.id ? savedSession : session)
          : [savedSession, ...sessions]
        persistDemo(nextSessions, logs)
      } else if (supabase && user) {
        if (existing) {
          const { data, error: queryError } = await supabase.from('sessions').update(values).eq('id', existing.id).select().single()
          if (queryError) throw queryError
          savedSession = data as WorkSession
          setSessions((current) => current.map((session) => session.id === existing.id ? savedSession : session))
        } else {
          const { data, error: queryError } = await supabase.from('sessions').insert({ ...values, user_id: user.id }).select().single()
          if (queryError) throw queryError
          savedSession = data as WorkSession
          setSessions((current) => [savedSession, ...current])
        }
      } else {
        setError('Your session is not connected. Sign in or use the sample workspace to save logs.')
        return false
      }
      setActiveSessionId(savedSession.id)
      if (!existing) setActiveTab('logs')
      setSessionModalOpen(false)
      setSidebarOpen(false)
    } catch (saveFailure) {
      setError(saveFailure instanceof Error ? saveFailure.message : 'Unable to save this session.')
    } finally {
      setBusy(false)
    }
  }

  async function saveLog(values: LogValues): Promise<boolean> {
    if (!activeSession) return false
    const validationMessage = validateShift(values.time_in, values.time_out, values.break_minutes, activeSession.deduct_break)
    if (validationMessage) {
      setFormError(validationMessage)
      return false
    }
    if (values.log_date < activeSession.start_date) {
      setFormError('A log cannot be dated before this session starts.')
      return false
    }
    setFormError('')
    setBusy(true)
    setError('')
    try {
      const payload = { ...values, session_id: activeSession.id }
      let savedLog: WorkLog
      if (isDemo) {
        savedLog = {
          ...payload,
          id: editingLog?.id ?? crypto.randomUUID(),
          user_id: user?.id ?? 'minute-demo-user',
          created_at: editingLog?.created_at ?? new Date().toISOString(),
        }
        const nextLogs = editingLog
          ? logs.map((log) => log.id === editingLog.id ? savedLog : log)
          : [savedLog, ...logs]
        persistDemo(sessions, nextLogs)
      } else if (supabase && user) {
        if (editingLog) {
          const { data, error: queryError } = await supabase.from('logs').update(payload).eq('id', editingLog.id).select().single()
          if (queryError) throw queryError
          savedLog = data as WorkLog
          setLogs((current) => current.map((log) => log.id === editingLog.id ? savedLog : log))
        } else {
          const { data, error: queryError } = await supabase.from('logs').insert({ ...payload, user_id: user.id }).select().single()
          if (queryError) throw queryError
          savedLog = data as WorkLog
          setLogs((current) => [savedLog, ...current])
        }
      } else {
        return false
      }
      setLogModalOpen(false)
      setEditingLog(undefined)
      return true
    } catch (saveFailure) {
      setError(saveFailure instanceof Error ? saveFailure.message : 'Unable to save this log.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function deleteLog(log: WorkLog) {
    if (!window.confirm(`Delete the log for ${formatDate(log.log_date)}?`)) return
    setError('')
    if (isDemo) {
      persistDemo(sessions, logs.filter((item) => item.id !== log.id))
      return
    }
    if (!supabase) return
    const { error: queryError } = await supabase.from('logs').delete().eq('id', log.id)
    if (queryError) setError(queryError.message)
    else setLogs((current) => current.filter((item) => item.id !== log.id))
  }

  async function deleteSession() {
    if (!activeSession || !window.confirm(`Delete “${activeSession.name}” and all of its logs?`)) return
    setError('')
    if (isDemo) {
      const nextSessions = sessions.filter((session) => session.id !== activeSession.id)
      persistDemo(nextSessions, logs.filter((log) => log.session_id !== activeSession.id))
      setActiveSessionId(nextSessions[0]?.id ?? null)
      setActiveTab('logs')
      return
    }
    if (!supabase) return
    const { error: queryError } = await supabase.from('sessions').delete().eq('id', activeSession.id)
    if (queryError) setError(queryError.message)
    else {
      const nextSessions = sessions.filter((session) => session.id !== activeSession.id)
      setSessions(nextSessions)
      setActiveSessionId(nextSessions[0]?.id ?? null)
      setLogs((current) => current.filter((log) => log.session_id !== activeSession.id))
      setActiveTab('logs')
    }
  }

  function clockIn() {
    if (!activeSession) return
    const now = new Date()
    const timer: RunningTimer = {
      sessionId: activeSession.id,
      startedAt: now.toISOString(),
      logDate: toLocalDateString(now),
      timeIn: clockTime(now),
    }
    setRunningTimer(timer)
    setClockNow(now.getTime())
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer))
  }

  async function clockOut() {
    if (!runningTimer || !activeSession) return
    const now = new Date()
    const timeOut = clockTime(now)
    const elapsedMinutes = getElapsedMinutes(runningTimer.timeIn, timeOut)
    const breakMinutes = getClockOutBreakMinutes(
      activeSession.default_break_minutes,
      elapsedMinutes,
      activeSession.deduct_break,
    )
    const values: LogValues = {
      log_date: runningTimer.logDate,
      time_in: runningTimer.timeIn,
      time_out: timeOut,
      break_minutes: breakMinutes,
      note: 'Clocked in and out',
    }
    const validationMessage = validateShift(values.time_in, values.time_out, values.break_minutes, activeSession.deduct_break)
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    if (await saveLog(values)) {
      setRunningTimer(null)
      localStorage.removeItem(TIMER_KEY)
    }
  }

  function exportCsv() {
    if (!activeSession) return
    const rows = [
      ['Date', 'Clock in', 'Clock out', 'Break minutes', 'Worked', 'Note'],
      ...sessionLogs.map((log) => [
        log.log_date,
        log.time_in.slice(0, 5),
        log.time_out.slice(0, 5),
        String(log.break_minutes),
        formatDuration(getWorkedMinutes(log.time_in, log.time_out, log.break_minutes, activeSession.deduct_break)),
        log.note ?? '',
      ]),
    ]
    const content = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${activeSession.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-logs.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function exportPdf() {
    if (!activeSession) return
    const { jsPDF } = await import('jspdf')
    const document = new jsPDF()
    document.setFont('helvetica', 'bold')
    document.setFontSize(20)
    document.text('Minute · work log', 16, 20)
    document.setFont('helvetica', 'normal')
    document.setFontSize(11)
    document.text(activeSession.name, 16, 29)
    document.text(`Exported ${formatDate(toLocalDateString(new Date()))}`, 16, 36)
    let y = 50
    document.setFont('helvetica', 'bold')
    document.text('Date', 16, y)
    document.text('In  /  Out', 57, y)
    document.text('Worked', 103, y)
    document.text('Note', 137, y)
    document.setDrawColor(220, 225, 220)
    document.line(16, y + 3, 194, y + 3)
    document.setFont('helvetica', 'normal')
    for (const log of [...sessionLogs].sort((left, right) => left.log_date.localeCompare(right.log_date))) {
      y += 10
      if (y > 275) {
        document.addPage()
        y = 20
      }
      document.text(formatDate(log.log_date, { month: 'short', day: 'numeric' }), 16, y)
      document.text(`${log.time_in.slice(0, 5)} – ${log.time_out.slice(0, 5)}`, 57, y)
      document.text(formatDuration(getWorkedMinutes(log.time_in, log.time_out, log.break_minutes, activeSession.deduct_break)), 103, y)
      document.text((log.note ?? '—').slice(0, 30), 137, y)
    }
    document.save(`${activeSession.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-logs.pdf`)
  }

  if (!authReady) {
    return <main className="auth-loading"><span className="spinner" /> Preparing your workspace…</main>
  }
  if (!user && !isDemo) {
    return <AuthScreen authEnabled={Boolean(supabase)} busy={authBusy} error={authError} message={authMessage} onSubmit={handleAuth} onDemo={startDemo} />
  }

  const targetHours = activeSession
    ? getEffectiveTargetHours(activeSession.target_hours, activeSession.start_date, activeSession.target_end_date, activeSession.required_hours_per_day)
    : null
  const overview: Overview | null = activeSession
    ? calculateOverview(sessionLogs, activeSession.required_hours_per_day, activeSession.deduct_break, targetHours)
    : null
  const targetProgress = overview?.remainingTargetMinutes !== null && overview?.remainingTargetMinutes !== undefined && targetHours
    ? Math.min(100, ((targetHours * 60 - overview.remainingTargetMinutes) / (targetHours * 60)) * 100)
    : 0
  const elapsedTimer = runningTimer ? Math.max(0, Math.floor((clockNow - new Date(runningTimer.startedAt).getTime()) / 1000)) : 0
  const timerLabel = `${String(Math.floor(elapsedTimer / 3600)).padStart(2, '0')}:${String(Math.floor((elapsedTimer % 3600) / 60)).padStart(2, '0')}:${String(elapsedTimer % 60).padStart(2, '0')}`

  return (
    <div className={`app-shell theme-${theme}`}>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <a className="brand-lockup" href="#workspace" aria-label="Minute home"><span className="brand-mark"><Clock3 size={19} /></span><span>minute</span></a>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>
        <div className="sidebar-label-row"><span className="sidebar-label">YOUR SESSIONS</span><span className="session-count">{sessions.length}</span></div>
        <nav className="session-nav" aria-label="Sessions">
          {sessions.map((session) => (
            <button key={session.id} className={`session-nav-item ${session.id === activeSessionId ? 'active' : ''}`} onClick={() => { setActiveSessionId(session.id); setActiveTab('logs'); setCoverageApplied(false); setSidebarOpen(false) }}>
              <span className="session-nav-mark"><Clock3 size={15} /></span>
              <span className="session-nav-copy"><strong>{session.name}</strong><small>Started {formatDate(session.start_date, { month: 'short', year: 'numeric' })}</small></span>
              {session.id === activeSessionId && <span className="nav-active-dot" />}
            </button>
          ))}
          {!sessions.length && !loadingData && <p className="sidebar-empty">Your sessions will show up here.</p>}
          {loadingData && <div className="sidebar-loading"><span className="spinner spinner-small" /> Loading sessions</div>}
        </nav>
        <button className="new-session-link" onClick={() => setSessionModalOpen(true)}><span><Plus size={16} /></span> New session</button>
        <div className="sidebar-bottom">
          {isDemo && <div className="demo-chip"><span className="live-dot" /> Preview workspace</div>}
          <div className="profile-row"><div className="avatar-mark">{(user?.email?.[0] ?? 'D').toUpperCase()}</div><div className="profile-copy"><strong>{user?.email ?? 'Demo workspace'}</strong><small>{isDemo ? 'Local preview' : 'Personal account'}</small></div><button className="icon-button signout-button" title="Sign out" onClick={() => void signOut()}><LogOut size={16} /></button></div>
        </div>
      </aside>

      <main className="workspace" id="workspace">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><span className="topbar-date"><CalendarDays size={15} /> {formatDate(toLocalDateString(new Date()), { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
          <div className="topbar-actions">
            {isDemo && <span className="topbar-demo"><span className="live-dot" /> DEMO</span>}
            <button className="icon-button theme-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            <button className="topbar-avatar" aria-label="Account">{(user?.email?.[0] ?? 'D').toUpperCase()}</button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="error-banner" role="alert"><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
          {!sessions.length && !loadingData ? (
            <section className="empty-workspace"><span className="empty-icon"><Clock3 size={25} /></span><span className="eyebrow">A FRESH START</span><h1>Make room for progress.</h1><p>Create your first session to begin tracking the work that moves you forward.</p><button className="button button-primary" onClick={() => setSessionModalOpen(true)}><Plus size={17} /> Create a session</button></section>
          ) : activeSession ? (
            <>
              <section className="session-heading">
                <div className="session-title-block"><span className="eyebrow">YOUR WORK, IN FOCUS</span><h1>{activeSession.name}</h1><p><span className="heading-date"><CalendarDays size={15} /> Since {formatDate(activeSession.start_date)}</span><span className="heading-separator">/</span><span>{formatDuration(overview?.totalWorkedMinutes ?? 0)} logged</span></p></div>
                <div className="heading-menu-wrap"><button className="icon-button heading-more" title="Session actions" onClick={() => setActiveTab('settings')}><MoreHorizontal size={21} /></button></div>
              </section>

              <div className="session-toolbar">
                <div className="tab-list" role="tablist" aria-label="Session views">
                  {(['logs', 'overview', 'settings'] as const).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab === 'settings' && <Settings2 size={15} />}{tab === 'logs' ? 'Logs' : tab === 'overview' ? 'Overview' : 'Settings'}</button>)}
                </div>
                {activeTab === 'logs' && <div className="toolbar-actions">
                  <button className={`button ${isClockedIn ? 'button-clock-active' : 'button-secondary clock-button'}`} onClick={() => isClockedIn ? void clockOut() : clockIn()} disabled={busy || Boolean(runningTimer && !isClockedIn)}>
                    {isClockedIn ? <><span className="clock-live-dot" /> {busy ? 'Saving…' : 'Clock out'} <span className="timer-readout">{timerLabel}</span></> : <><Timer size={16} /> Clock in</>}
                  </button>
                  <div className="export-actions"><button className="icon-button" title="Export CSV" aria-label="Export CSV" onClick={exportCsv}><FileSpreadsheet size={17} /></button><button className="icon-button" title="Export PDF" aria-label="Export PDF" onClick={exportPdf}><FileText size={17} /></button></div>
                  <button className="button button-primary add-log-button" onClick={() => { setEditingLog(undefined); setFormError(''); setLogModalOpen(true) }}><Plus size={16} /> Add log</button>
                </div>}
              </div>

              {activeTab === 'logs' && <section className="logs-section" aria-label="Work logs">
                {runningTimer && !isClockedIn && <div className="notice-banner"><Timer size={16} /> Clock is running in another session. Clock out there before starting a new one.</div>}
                {loadingLogs ? <div className="loading-panel"><span className="spinner" /> Loading your logs…</div> : sessionLogs.length ? <div className="log-list">
                  {[...sessionLogs].sort((left, right) => right.log_date.localeCompare(left.log_date)).map((log) => {
                    const worked = getWorkedMinutes(log.time_in, log.time_out, log.break_minutes, activeSession.deduct_break)
                    const required = Math.round(activeSession.required_hours_per_day * 60)
                    const balance = worked - required
                    return <article className="log-row" key={log.id}>
                      <div className="log-date"><span className="log-weekday">{formatDate(log.log_date, { weekday: 'short' })}</span><strong>{formatDate(log.log_date, { month: 'short', day: 'numeric' })}</strong></div>
                      <div className="log-shift"><span className="shift-line"><span className="time-in-dot" />{log.time_in.slice(0, 5)} <span className="shift-dash">→</span> {log.time_out.slice(0, 5)}{log.time_out.slice(0, 5) < log.time_in.slice(0, 5) && <span className="overnight-tag">+1 day</span>}</span><span className="shift-note">{log.note || `${log.break_minutes} min break`}</span></div>
                      <div className="log-duration"><strong>{formatDuration(worked)}</strong><span className={`balance-label ${balance >= 0 ? 'balance-good' : 'balance-low'}`}>{balance >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{balance >= 0 ? '+' : '−'}{formatDuration(Math.abs(balance))}</span></div>
                      <div className="log-actions"><button className="icon-button" title="Edit log" aria-label={`Edit log for ${formatDate(log.log_date)}`} onClick={() => { setEditingLog(log); setFormError(''); setLogModalOpen(true) }}><Settings2 size={15} /></button><button className="icon-button delete-log-button" title="Delete log" aria-label={`Delete log for ${formatDate(log.log_date)}`} onClick={() => void deleteLog(log)}><Trash2 size={15} /></button></div>
                    </article>
                  })}
                </div> : <div className="empty-logs"><span className="empty-icon"><Clock3 size={22} /></span><h2>Your first hour is waiting.</h2><p>Add a work log or clock in to start building your record.</p><button className="button button-primary" onClick={() => { setFormError(''); setLogModalOpen(true) }}><Plus size={16} /> Add your first log</button></div>}
                {sessionLogs.length > 0 && <div className="logs-footnote"><span className="legend-dot" /> Daily comparison uses your {activeSession.required_hours_per_day}h requirement. Only logged days count toward undertime.</div>}
              </section>}

              {activeTab === 'overview' && overview && <section className="overview-section">
                <div className="overview-intro"><div><span className="eyebrow">THE BIG PICTURE</span><h2>Your progress, at a glance.</h2></div><span className="overview-period">Since {formatDate(activeSession.start_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                <div className="metric-grid">
                  <article className="metric metric-primary"><span className="metric-label">TOTAL TIME</span><strong>{formatDuration(overview.totalWorkedMinutes)}</strong><span className="metric-caption">Across {overview.days.length} logged {overview.days.length === 1 ? 'day' : 'days'}</span><Clock3 className="metric-icon" size={19} /></article>
                  <article className="metric"><span className="metric-label">TIME BANK</span><strong>{formatDuration(overview.totalSurplusMinutes)}</strong><span className="metric-caption">Surplus from logged days</span><ArrowUpRight className="metric-icon metric-icon-green" size={19} /></article>
                  <article className={`metric ${overview.netBalanceMinutes < 0 ? 'metric-alert' : ''}`}><span className="metric-label">NET BALANCE</span><strong>{overview.netBalanceMinutes < 0 ? '−' : '+'}{formatDuration(Math.abs(overview.netBalanceMinutes))}</strong><span className="metric-caption">Extra time minus undertime</span>{overview.netBalanceMinutes < 0 ? <ArrowDownRight className="metric-icon metric-icon-red" size={19} /> : <Check className="metric-icon metric-icon-green" size={19} />}</article>
                </div>

                {targetHours !== null && <section className="target-section">
                  <div className="section-heading"><div><span className="eyebrow">THE FINISH LINE</span><h3>{activeSession.target_end_date ? 'Target date progress' : 'Hours toward your target'}</h3></div><span className="target-percent">{Math.round(targetProgress)}%</span></div>
                  <div className="progress-track"><span style={{ width: `${targetProgress}%` }} /></div>
                  <div className="target-details"><span>{formatDuration(overview.totalWorkedMinutes)} <span>completed</span></span><span>{formatDuration(overview.remainingTargetMinutes ?? 0)} <span>remaining of {formatDuration(targetHours * 60)}</span></span></div>
                  <div className="estimate-line"><span><CalendarDays size={15} /> Estimated finish</span><strong>{overview.remainingTargetMinutes === 0 ? 'Target reached' : overview.estimatedCompletionDate ? formatDate(overview.estimatedCompletionDate) : 'Set daily hours to estimate'}</strong>{activeSession.target_end_date && <small>Goal date: {formatDate(activeSession.target_end_date)}</small>}</div>
                </section>}

                <section className="balance-section">
                  <div className="section-heading balance-heading"><div><span className="eyebrow">DAY BY DAY</span><h3>Undertime & overtime</h3></div><span className="balance-totals"><span className="positive-text">+{formatDuration(overview.totalSurplusMinutes)}</span><span className="totals-divider">/</span><span className="negative-text">−{formatDuration(overview.totalDeficitMinutes)}</span></span></div>
                  {overview.days.length ? <div className="balance-table">
                    {overview.days.map((day) => {
                      const covered = coverageApplied ? day.coveredMinutes : 0
                      const uncovered = day.deficitMinutes - covered
                      const tone = day.deficitMinutes === 0 ? 'day-on-track' : uncovered === 0 ? 'day-covered' : covered > 0 ? 'day-partial' : 'day-short'
                      return <div className={`balance-row ${tone}`} key={day.date}><span className="balance-day-date">{formatDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span className="balance-day-worked">{formatDuration(day.workedMinutes)} <small>of {formatDuration(day.requiredMinutes)}</small></span><span className="balance-day-result">{day.surplusMinutes > 0 ? <><ArrowUpRight size={14} /> +{formatDuration(day.surplusMinutes)}</> : day.deficitMinutes > 0 ? <><ArrowDownRight size={14} /> −{formatDuration(day.deficitMinutes)}</> : <><Check size={14} /> On track</>}</span><span className="day-status-dot" /></div>
                    })}
                  </div> : <div className="overview-empty">Log a day to see your time balance.</div>}
                  <div className="allocation-control"><div><strong>Apply extra time</strong><span>Use surplus hours to cover your oldest undertime days.</span></div><button className={`button ${coverageApplied ? 'button-secondary' : 'button-dark'}`} onClick={() => setCoverageApplied(!coverageApplied)} disabled={!overview.coveredDays.length}>{coverageApplied ? 'Hide allocation' : 'Apply extra time'} <ArrowRight size={15} /></button></div>
                  {coverageApplied && <div className="allocation-result"><div className="allocation-summary"><span><Check size={15} /> {overview.coveredDays.length ? `${formatDuration(overview.coveredDays.reduce((total, day) => total + day.coveredMinutes, 0))} applied` : 'No undertime to cover'}</span><strong>{formatDuration(overview.remainingExtraMinutes)} remaining in time bank</strong></div>{overview.coveredDays.length > 0 && <div className="covered-days">{overview.coveredDays.map((day) => <div key={day.date}><span>{formatDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span>Covered {formatDuration(day.coveredMinutes)} of {formatDuration(day.deficitMinutes)}</span></div>)}</div>}<small>Allocation is calculated from your current logs and does not change recorded hours.</small></div>}
                </section>
                <p className="assumption-note">Only dates with logs are counted as workdays. Calendar days are used for finish estimates because no weekly schedule is set.</p>
              </section>}

              {activeTab === 'settings' && <section className="settings-section"><div className="settings-intro"><span className="eyebrow">MAKE IT YOURS</span><h2>Session settings</h2><p>Update your target, daily hours, and break rules.</p></div><div className="settings-form-wrap"><SessionForm key={activeSession.id} initial={activeSession} busy={busy} onSave={(values) => void saveSession(values, activeSession)} /></div><div className="danger-zone"><div><strong>Delete this session</strong><span>This permanently removes the session and every log inside it.</span></div><button className="button button-danger" onClick={() => void deleteSession()}><Trash2 size={15} /> Delete session</button></div></section>}
            </>
          ) : <div className="loading-panel"><span className="spinner" /> Loading your workspace…</div>}
          <footer className="workspace-footer"><span>MINUTE <span className="footer-dot">·</span> A LITTLE MORE PRESENT</span><span>{isDemo ? 'Sample data is saved in this browser' : 'Your workspace is private'}</span></footer>
        </div>
      </main>

      {sessionModalOpen && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSessionModalOpen(false) }}><div className="modal-panel" role="dialog" aria-modal="true" aria-label="Create session"><SessionForm busy={busy} onSave={(values) => void saveSession(values)} onCancel={() => setSessionModalOpen(false)} /></div></div>}
      {logModalOpen && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogModalOpen(false) }}><div className="modal-panel" role="dialog" aria-modal="true" aria-label={editingLog ? 'Edit log' : 'Add log'}>{formError && <div className="form-error modal-error" role="alert">{formError}</div>}<LogForm key={editingLog?.id ?? 'new-log'} initial={editingLog} defaultBreak={activeSession?.default_break_minutes ?? 0} busy={busy} onSave={(values) => void saveLog(values)} onCancel={() => { setLogModalOpen(false); setEditingLog(undefined); setFormError('') }} /></div></div>}
    </div>
  )
}

export default App
