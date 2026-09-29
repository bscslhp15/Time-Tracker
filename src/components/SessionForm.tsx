import { useState, type FormEvent } from 'react'
import { ArrowRight, CalendarDays, X } from 'lucide-react'
import type { WorkSession } from '../lib/types'
import { toLocalDateString } from '../utils/time'

export type SessionValues = {
  name: string
  start_date: string
  target_hours: number | null
  target_end_date: string | null
  required_hours_per_day: number
  default_break_minutes: number
  deduct_break: boolean
}

type SessionFormProps = {
  initial?: WorkSession
  busy?: boolean
  onSave: (values: SessionValues) => void
  onCancel?: () => void
}

export function SessionForm({ initial, busy = false, onSave, onCancel }: SessionFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(() => initial?.start_date ?? toLocalDateString(new Date()))
  const [targetKind, setTargetKind] = useState<'none' | 'hours' | 'date'>(initial?.target_hours ? 'hours' : initial?.target_end_date ? 'date' : 'none')
  const [targetHours, setTargetHours] = useState(initial?.target_hours?.toString() ?? '')
  const [targetEndDate, setTargetEndDate] = useState(initial?.target_end_date ?? '')
  const [requiredHours, setRequiredHours] = useState(initial?.required_hours_per_day?.toString() ?? '8')
  const [breakMinutes, setBreakMinutes] = useState(initial?.default_break_minutes?.toString() ?? '0')
  const [deductBreak, setDeductBreak] = useState(initial?.deduct_break ?? false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({
      name: name.trim(),
      start_date: startDate,
      target_hours: targetKind === 'hours' ? Number(targetHours) : null,
      target_end_date: targetKind === 'date' ? targetEndDate : null,
      required_hours_per_day: Number(requiredHours),
      default_break_minutes: Number(breakMinutes),
      deduct_break: deductBreak,
    })
  }

  return (
    <form className="stack-form session-form" onSubmit={handleSubmit}>
      {onCancel && <button className="icon-button modal-close" type="button" aria-label="Close" onClick={onCancel}><X size={19} /></button>}
      <div className="form-heading">
        <span className="eyebrow">{initial ? 'SESSION SETTINGS' : 'NEW SESSION'}</span>
        <h2>{initial ? 'Shape your session' : 'Start a new session'}</h2>
        <p>{initial ? 'Adjust the details whenever your plan changes.' : 'Give your next chapter a name and a finish line.'}</p>
      </div>
      <label>Session name<input autoFocus={!initial} maxLength={80} placeholder="e.g. Product design internship" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
      <div className="field-group">
        <span className="field-label">Your target <span className="optional-label">optional</span></span>
        <div className="segmented-control target-switch">
          {(['none', 'hours', 'date'] as const).map((kind) => <button key={kind} type="button" className={targetKind === kind ? 'selected' : ''} onClick={() => setTargetKind(kind)}>{kind === 'none' ? 'No target' : kind === 'hours' ? 'Hours' : 'End date'}</button>)}
        </div>
        {targetKind === 'hours' && <label className="nested-field">Target hours<input type="number" min="0.25" step="0.25" placeholder="e.g. 500" value={targetHours} onChange={(event) => setTargetHours(event.target.value)} required /></label>}
        {targetKind === 'date' && <label className="nested-field">Target end date<input type="date" min={startDate} value={targetEndDate} onChange={(event) => setTargetEndDate(event.target.value)} required /></label>}
      </div>
      <div className="form-row">
        <label>Required per day <span className="input-suffix">hours</span><input className="with-suffix" type="number" min="0" max="24" step="0.25" value={requiredHours} onChange={(event) => setRequiredHours(event.target.value)} required /></label>
        <label>Default break <span className="input-suffix">minutes</span><input className="with-suffix" type="number" min="0" max="1440" step="1" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} required /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={deductBreak} onChange={(event) => setDeductBreak(event.target.checked)} /><span><strong>Deduct breaks from worked time</strong><small>Turn this on when your break is unpaid.</small></span></label>
      {targetKind === 'date' && <p className="inline-hint"><CalendarDays size={14} /> Date targets estimate planned hours using calendar days.</p>}
      <div className="form-actions">
        {onCancel && <button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create session'} <ArrowRight size={16} /></button>
      </div>
    </form>
  )
}