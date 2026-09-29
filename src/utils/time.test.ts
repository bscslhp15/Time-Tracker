import { describe, expect, it } from 'vitest'
import type { WorkLog } from '../lib/types'
import {
  calculateOverview,
  formatDuration,
  getClockOutBreakMinutes,
  getEffectiveTargetHours,
  getElapsedMinutes,
  getWorkedMinutes,
  toLocalDateString,
  validateShift,
} from './time'

describe('time calculations', () => {
  it('calculates overnight shifts and conditionally deducts breaks', () => {
    expect(getWorkedMinutes('22:00', '06:00', 30, true)).toBe(450)
    expect(getWorkedMinutes('22:00', '06:00', 30, false)).toBe(480)
    expect(getWorkedMinutes('09:00:00', '17:30:00', 30, true)).toBe(480)
  })

  it('validates equal times and breaks longer than a shift', () => {
    expect(validateShift('08:00', '08:00', 0, true)).toContain('different')
    expect(validateShift('08:00', '09:00', 60, true)).toContain('shorter')
    expect(validateShift('22:00', '06:00', 30, true)).toBeNull()
    expect(getElapsedMinutes('07:40:05', '07:40:35')).toBeCloseTo(0.5)
    expect(validateShift('07:40:05', '07:40:35', 0, true)).toBeNull()
    expect(getClockOutBreakMinutes(60, 3, true)).toBe(0)
    expect(getClockOutBreakMinutes(60, 65, true)).toBe(60)
  })

  it('formats durations and local dates without UTC conversion', () => {
    expect(formatDuration(450)).toBe('7h 30m')
    expect(toLocalDateString(new Date(2026, 0, 2))).toBe('2026-01-02')
    expect(getEffectiveTargetHours(null, '2026-03-07', '2026-03-09', 8)).toBe(24)
  })

  it('allocates surplus to the oldest logged undertime day', () => {
    const logs = [
      { id: '1', session_id: 's', user_id: 'u', log_date: '2026-01-01', time_in: '08:00', time_out: '18:00', break_minutes: 0, note: null, created_at: '' },
      { id: '2', session_id: 's', user_id: 'u', log_date: '2026-01-02', time_in: '08:00', time_out: '14:00', break_minutes: 0, note: null, created_at: '' },
    ] satisfies WorkLog[]

    const overview = calculateOverview(logs, 8, true, 40, '2026-01-03')
    expect(overview.totalSurplusMinutes).toBe(120)
    expect(overview.totalDeficitMinutes).toBe(120)
    expect(overview.netBalanceMinutes).toBe(0)
    expect(overview.coveredDays).toMatchObject([{ date: '2026-01-02', coveredMinutes: 120 }])
    expect(overview.days[1].coveredMinutes).toBe(120)
    expect(overview.remainingExtraMinutes).toBe(0)
  })
})