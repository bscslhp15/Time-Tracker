import type { Overview, WorkLog } from '../lib/types'

const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/

export function parseTime(value: string): number | null {
  const match = TIME_PATTERN.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? 0)
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return hours * 60 + minutes + seconds / 60
}

export function getElapsedMinutes(timeIn: string, timeOut: string): number {
  const start = parseTime(timeIn)
  const end = parseTime(timeOut)
  if (start === null || end === null || start === end) return 0
  return end > start ? end - start : 24 * 60 - start + end
}

export function getWorkedMinutes(
  timeIn: string,
  timeOut: string,
  breakMinutes: number,
  deductBreak: boolean,
): number {
  const elapsed = getElapsedMinutes(timeIn, timeOut)
  return Math.max(0, elapsed - (deductBreak ? breakMinutes : 0))
}

export function validateShift(
  timeIn: string,
  timeOut: string,
  breakMinutes: number,
  deductBreak: boolean,
): string | null {
  if (parseTime(timeIn) === null || parseTime(timeOut) === null) {
    return 'Enter valid 24-hour times.'
  }
  const elapsed = getElapsedMinutes(timeIn, timeOut)
  if (elapsed === 0) return 'Clock-out must be different from clock-in.'
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
    return 'Break time must be a whole number of minutes.'
  }
  if (deductBreak && breakMinutes >= elapsed) {
    return 'Break time must be shorter than the shift.'
  }
  return null
}

export function getClockOutBreakMinutes(
  defaultBreakMinutes: number,
  elapsedMinutes: number,
  deductBreak: boolean,
): number {
  if (deductBreak && defaultBreakMinutes >= elapsedMinutes) return 0
  return defaultBreakMinutes
}

export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addCalendarDays(value: string, amount: number): string {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return toLocalDateString(date)
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en', options ?? { month: 'short', day: 'numeric', year: 'numeric' })
    .format(parseLocalDate(value))
}

export function getEffectiveTargetHours(
  targetHours: number | null,
  startDate: string,
  targetEndDate: string | null,
  requiredHoursPerDay: number,
): number | null {
  if (targetHours !== null) return targetHours
  if (!targetEndDate) return null
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = targetEndDate.split('-').map(Number)
  const start = Date.UTC(startYear, startMonth - 1, startDay)
  const end = Date.UTC(endYear, endMonth - 1, endDay)
  const days = Math.max(1, Math.floor((end - start) / 86_400_000) + 1)
  return days * requiredHoursPerDay
}

export function calculateOverview(
  logs: WorkLog[],
  requiredHoursPerDay: number,
  deductBreak: boolean,
  targetHours: number | null,
  today = toLocalDateString(new Date()),
): Overview {
  const requiredMinutes = Math.round(requiredHoursPerDay * 60)
  const totalsByDate = new Map<string, number>()

  for (const log of logs) {
    const worked = getWorkedMinutes(log.time_in, log.time_out, log.break_minutes, deductBreak)
    totalsByDate.set(log.log_date, (totalsByDate.get(log.log_date) ?? 0) + worked)
  }

  const days = [...totalsByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, workedMinutes]) => ({
      date,
      workedMinutes,
      requiredMinutes,
      surplusMinutes: Math.max(0, workedMinutes - requiredMinutes),
      deficitMinutes: Math.max(0, requiredMinutes - workedMinutes),
      coveredMinutes: 0,
    }))

  const totalWorkedMinutes = days.reduce((total, day) => total + day.workedMinutes, 0)
  const totalSurplusMinutes = days.reduce((total, day) => total + day.surplusMinutes, 0)
  const totalDeficitMinutes = days.reduce((total, day) => total + day.deficitMinutes, 0)
  const netBalanceMinutes = totalSurplusMinutes - totalDeficitMinutes
  const remainingTargetMinutes = targetHours === null
    ? null
    : Math.max(0, Math.round(targetHours * 60) - totalWorkedMinutes)
  const estimatedCompletionDate = remainingTargetMinutes === null || requiredMinutes === 0
    ? null
    : addCalendarDays(today, Math.ceil(remainingTargetMinutes / requiredMinutes))

  let availableExtraMinutes = totalSurplusMinutes
  const coveredDays = days.map((day) => {
    const coveredMinutes = Math.min(day.deficitMinutes, availableExtraMinutes)
    availableExtraMinutes -= coveredMinutes
    return { ...day, coveredMinutes }
  }).filter((day) => day.coveredMinutes > 0)
  const coveredByDate = new Map(coveredDays.map((day) => [day.date, day.coveredMinutes]))
  const daysWithCoverage = days.map((day) => ({
    ...day,
    coveredMinutes: coveredByDate.get(day.date) ?? 0,
  }))

  return {
    totalWorkedMinutes,
    totalSurplusMinutes,
    totalDeficitMinutes,
    netBalanceMinutes,
    remainingTargetMinutes,
    estimatedCompletionDate,
    days: daysWithCoverage,
    coveredDays,
    remainingExtraMinutes: availableExtraMinutes,
  }
}