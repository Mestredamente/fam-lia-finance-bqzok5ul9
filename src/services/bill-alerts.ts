import type { BillAlert, BillItem } from '@/types/finance'

/**
 * Derive bill alerts from a consolidated list of bills.
 *
 * Returns one alert per active condition:
 *  - 'overdue': bills whose status is 'vencida'
 *  - 'upcoming': bills due within the next 3 days (status 'a_vencer' AND due
 *    date <= today+3)
 *
 * The overdue alert always comes first when both are present, so callers can
 * render the most urgent condition on top. Returns an empty array when
 * nothing is overdue and nothing is due within 3 days.
 *
 * (Exported for future use by the server-side cron — for now only consumed by
 * the Dashboard.)
 */
export function generateBillAlerts(contas: BillItem[]): BillAlert[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 3)

  const overdue = contas.filter((c) => c.status === 'vencida')
  const upcoming = contas.filter((c) => {
    if (c.status !== 'a_vencer') return false
    const due = new Date(c.dueDate)
    const d = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    return d <= horizon
  })

  const alerts: BillAlert[] = []
  if (overdue.length > 0) {
    alerts.push({
      type: 'overdue',
      count: overdue.length,
      total: overdue.reduce((s, c) => s + c.amount, 0),
      accounts: overdue,
    })
  }
  if (upcoming.length > 0) {
    alerts.push({
      type: 'upcoming',
      count: upcoming.length,
      total: upcoming.reduce((s, c) => s + c.amount, 0),
      accounts: upcoming,
    })
  }
  return alerts
}
