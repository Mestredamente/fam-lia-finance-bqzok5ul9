import { useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { addNotification } from '@/stores/notifications'
import { getBudgetsByFamilyId } from '@/services/budgets'
import { getTransactionsByFamilyAndDateRange } from '@/services/transactions'
import {
  hasNotificationBeenSent,
  markNotificationSent,
  getTodayKey,
} from '@/lib/notification-utils'
import { formatBRL } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

export function useBudgetAlerts(familyId: string | undefined, enabled: boolean = true) {
  const checkBudget = useCallback(
    async (tx: TransactionRecord) => {
      if (!familyId || tx.family_id !== familyId || tx.type !== 'expense') return
      try {
        const budgets = await getBudgetsByFamilyId(familyId)
        const budget = budgets.find((b) => b.category_id === tx.category_id)
        if (!budget) return

        const now = new Date()
        const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1
        const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
        const endDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`

        const transactions = await getTransactionsByFamilyAndDateRange(familyId, startDate, endDate)
        const spent = transactions
          .filter(
            (t) =>
              t.type === 'expense' &&
              t.category_id === budget.category_id &&
              (!budget.member_id || t.owner_id === budget.member_id),
          )
          .reduce((sum, t) => sum + t.amount, 0)

        const pct = budget.monthly_limit > 0 ? Math.round((spent / budget.monthly_limit) * 100) : 0
        const cat = budget.expand?.category_id
        const catName = cat?.name || 'Categoria'

        // Alert threshold: ≥100% (excedido)
        if (spent >= budget.monthly_limit) {
          const key = `budget_exceeded_${budget.id}_${getTodayKey()}`
          if (!hasNotificationBeenSent(key)) {
            addNotification({
              title: 'Orçamento excedido!',
              description: `${catName}: ${formatBRL(spent)} de ${formatBRL(budget.monthly_limit)}`,
              iconColor: cat?.color,
            })
            markNotificationSent(key)
          }
          return
        }

        // Alert threshold: ≥80% (quase no limite)
        if (pct >= 80) {
          const key = `budget_alert_${budget.id}_${getTodayKey()}`
          if (!hasNotificationBeenSent(key)) {
            addNotification({
              title: 'Orçamento quase no limite',
              description: `${catName}: ${formatBRL(spent)} de ${formatBRL(
                budget.monthly_limit,
              )} (${pct}%)`,
              iconColor: cat?.color,
            })
            markNotificationSent(key)
          }
        }
      } catch {
        // noop
      }
    },
    [familyId],
  )

  useRealtime(
    'transactions',
    (e) => {
      if (e.action === 'create') checkBudget(e.record as unknown as TransactionRecord)
    },
    enabled && !!familyId,
  )
}
