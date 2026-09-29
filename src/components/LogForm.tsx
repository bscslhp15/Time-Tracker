import { useState, type FormEvent } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { WorkLog } from '../lib/types'
import { toLocalDateString } from '../utils/time'

export type LogValues = {
  log_date: string
  time_in: string
  time_out: string
  break_minutes: number
  note: string | null
}

type LogFormProps = {
  initial?: WorkLog
  defaultBreak: number
  busy?: boolean
  onSave: (values: LogValues) => void
  onCancel: () => void
}

export function LogForm({ initial, defaultBreak, busy = false, onSave, onCancel }: LogFormProps) {
  const [date, setDate] = useState(() => initial?.log_date ?? toLocalDateString(new Date()))
  const [timeIn, setTimeIn] = useState(initial?.time_in?.slice(0, 5) ?? '09:00')
  const [timeOut, setTimeOut] = useState(initial?.time_out?.slice(0, 5) ?? '17:00')
  const [breakMinutes, setBreakMinutes] = useState(String(initial?.break_minutes ?? defaultBreak))
  const [note, setNote] = useState(initial?.note ?? '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ log_date: date, time_in: timeIn, time_out: timeOut, break_minutes: Number(breakMinutes), note: note.trim() || null })
  }

  return (
    <form className="stack-form log-form" onSubmit={handleSubmit}>
      <button className="icon-button modal-close" type="button" aria-label="Close" onClick={onCancel}><X size={19} /></button>
      <div className="form-heading">
        <span className="eyebrow">{initial ? 'EDIT ENTRY' : 'NEW ENTRY'}</span>
        <h2>{initial ? 'Update your hours' : 'Add a day'}</h2>
        <p>Times can cross midnight for evening or overnight shifts.</p>
      </div>
      <label>Date worked<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      <div className="form-row">
        <label>Clock in<input type="time" value={timeIn} onChange={(event) => setTimeIn(event.target.value)} required /></label>
        <label>Clock out<input type="time" value={timeOut} onChange={(event) => setTimeOut(event.target.value)} required /></label>
      </div>
      <label>Break taken <span className="input-suffix">minutes</span><input className="with-suffix" type="number" min="0" max="1440" step="1" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} required /></label>
      <label>Note <span className="optional-label">optional</span><textarea rows={3} maxLength={500} placeholder="A quick note about the day…" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="form-actions">
        <button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save entry' : 'Add log'} <ArrowRight size={16} /></button>
      </div>
    </form>
  )
}