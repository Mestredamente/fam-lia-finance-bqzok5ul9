import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useContasAPagar } from '@/hooks/use-contas-a-pagar'
import { useBudgets } from '@/hooks/use-budgets'
import { getInvoicesByFamilyId } from '@/services/invoices'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import {
  generateBillAlerts,
  type BudgetAlertInput,
  type InvoiceAlertInput,
} from '@/services/bill-alerts'
import { addNotification, useNotificationsStore } from '@/stores/notifications'
import { loadNotificationPrefs } from '@/pages/Notifications'

export function useBillNotifications(enabled: boolean = true) {
  const { family } = useAuth()
  const { contas, refetch: refetchContas } = useContasAPagar(
    enabled && family ? family.id : undefined,
  )
  const { budgets, refetch: refetchBudgets } = useBudgets(enabled && family ? family.id : undefined)
  const { notifications } = useNotificationsStore()
  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  const syncBillNotifications = useCallback(async () => {
    if (!enabled || !family) return

    const prefs = loadNotificationPrefs()

    // 1. Fetch Invoices
    let invoiceInputs: InvoiceAlertInput[] = []
    try {
      const invoices = await getInvoicesByFamilyId(family.id)
      invoiceInputs = invoices.map((inv) => ({
        id: inv.id,
        cardId: inv.card_id,
        cardName: (inv.expand?.card_id as { name?: string })?.name || 'Cartão',
        totalAmount: inv.total_amount,
        status: inv.status,
        createdAt: inv.created,
      }))
    } catch {
      invoiceInputs = []
    }

    // 2. Fetch Budget Progress
    let budgetInputs: BudgetAlertInput[] = []
    try {
      const now = new Date()
      const txs = await getTransactionsByFamilyAndMonth(
        family.id,
        now.getFullYear(),
        now.getMonth(),
      )
      budgetInputs = budgets
        .filter((b) => b.is_active && b.monthly_limit > 0)
        .map((b) => {
          const spent = txs
            .filter((t) => t.type === 'expense' && t.category_id === b.category_id)
            .reduce((sum, t) => sum + t.amount, 0)
          const catName = (b.expand?.category_id as { name?: string })?.name || 'Categoria'
          return {
            categoryId: b.category_id,
            categoryName: catName,
            spent,
            limit: b.monthly_limit,
          }
        })
    } catch {
      budgetInputs = []
    }

    // 3. Generate structured alerts
    const alerts = generateBillAlerts(contas, budgetInputs, invoiceInputs)
    const currentNotifications = notificationsRef.current

    for (const alert of alerts) {
      // Check preferences
      let isAllowed = true
      switch (alert.type) {
        case 'bill_overdue':
          isAllowed = prefs.contas_vencidas
          break
        case 'bill_due':
          isAllowed = prefs.contas_a_vencer
          break
        case 'invoice_ready':
          isAllowed = prefs.faturas_fechadas
          break
        case 'budget_warning':
          isAllowed = prefs.orcamento_80
          break
        case 'budget_exceeded':
          isAllowed = prefs.orcamento_100
          break
        case 'last_installment':
          isAllowed = prefs.ultima_parcela
          break
        case 'rotativo':
          isAllowed = prefs.saldo_rotativo
          break
        default:
          isAllowed = true
      }

      if (!isAllowed) continue

      // Dedup: check if an identical notification (by title + description) exists
      const exists = currentNotifications.some(
        (n) => n.title === alert.title && n.description === alert.description,
      )
      if (exists) continue

      addNotification({
        title: alert.title,
        description: alert.description,
        iconColor: alert.iconColor,
        link: alert.actionUrl,
        type: alert.type,
        actionLabel: alert.actionLabel,
        priority: alert.priority,
        amount: alert.amount,
      })
    }
  }, [enabled, family, contas, budgets])

  // Run on mount or when dependencies change
  useEffect(() => {
    syncBillNotifications()
  }, [syncBillNotifications])

  // Run periodically every 60s
  useEffect(() => {
    if (!enabled || !family) return
    const interval = setInterval(() => {
      Promise.all([refetchContas(), refetchBudgets()]).then(() => {
        syncBillNotifications()
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [enabled, family, refetchContas, refetchBudgets, syncBillNotifications])

  // Run on custom 'ff-refresh' event
  useEffect(() => {
    if (!enabled || !family) return
    const handleRefresh = () => {
      Promise.all([refetchContas(), refetchBudgets()]).then(() => {
        syncBillNotifications()
      })
    }
    window.addEventListener('ff-refresh', handleRefresh)
    return () => {
      window.removeEventListener('ff-refresh', handleRefresh)
    }
  }, [enabled, family, refetchContas, refetchBudgets, syncBillNotifications])
}
