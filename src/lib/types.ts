export type WorkSession = {
  id: string
  user_id: string
  name: string
  start_date: string
  target_hours: number | null
  target_end_date: string | null
  required_hours_per_day: number
  default_break_minutes: number
  deduct_break: boolean
  created_at: string
}

export type WorkLog = {
  id: string
  session_id: string
  user_id: string
  log_date: string
  time_in: string
  time_out: string
  break_minutes: number
  note: string | null
  created_at: string
}

export type DailyBalance = {
  date: string
  workedMinutes: number
  requiredMinutes: number
  surplusMinutes: number
  deficitMinutes: number
  coveredMinutes: number
}

export type Overview = {
  totalWorkedMinutes: number
  totalSurplusMinutes: number
  totalDeficitMinutes: number
  netBalanceMinutes: number
  remainingTargetMinutes: number | null
  estimatedCompletionDate: string | null
  days: DailyBalance[]
  coveredDays: DailyBalance[]
  remainingExtraMinutes: number
}