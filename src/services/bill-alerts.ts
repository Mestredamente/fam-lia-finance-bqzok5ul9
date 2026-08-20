import type { AppAlert, BillItem, BudgetAlertInput, InvoiceAlertInput } from '@/types/finance'
import { formatBRL } from '@/lib/utils'

export type { BudgetAlertInput, InvoiceAlertInput }

/**
 * Generate structured alerts across bills, budgets, and invoices.
 *
 * Alert types:
 * - bill_overdue: bills with status 'vencida'
 * - bill_due: bills due within the next 3 days (status 'a_vencer')
 * - invoice_ready: invoices with status 'pending_review' or ('pending'/'parsed') created in the last 3 days
 * - budget_warning: budgets with spent >= 80% && spent < 100%
 * - budget_exceeded: budgets with spent >= 100%
 * - last_installment: investments/debts where extraInfo is 'Parcela N/M' and N === M
 * - rotativo: invoices with status 'partial'
 */
export function generateBillAlerts(
  contas: BillItem[] = [],
  budgets: BudgetAlertInput[] = [],
  invoices: InvoiceAlertInput[] = [],
): AppAlert[] {
  const alerts: AppAlert[] = []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 3)

  // 1. Contas vencidas
  const overdueBills = contas.filter((c) => c.status === 'vencida' && !c.transactionId)
  for (const bill of overdueBills) {
    alerts.push({
      type: 'bill_overdue',
      title: 'Conta vencida',
      description: `${bill.description} - ${formatBRL(bill.amount)}`,
      amount: bill.amount,
      actionUrl: '/contas?tab=vencidas',
      actionLabel: 'Ver conta',
      priority: 'high',
      iconColor: '#ef4444',
      createdAt: bill.dueDate,
    })
  }

  // 2. Contas a vencer (próximos 3 dias)
  const upcomingBills = contas.filter((c) => {
    if (c.status !== 'a_vencer' || c.transactionId) return false
    const due = new Date(c.dueDate)
    const d = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    return d <= horizon
  })

  for (const bill of upcomingBills) {
    const due = new Date(bill.dueDate)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    const diffMs = dueDay.getTime() - today.getTime()
    const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))

    const title =
      diffDays === 0
        ? 'Conta vence hoje'
        : diffDays === 1
          ? 'Conta vence amanhã'
          : `Conta vence em ${diffDays} dias`

    alerts.push({
      type: 'bill_due',
      title,
      description: `${bill.description} - ${formatBRL(bill.amount)}`,
      amount: bill.amount,
      actionUrl: '/contas?tab=a_vencer',
      actionLabel: 'Ver conta',
      priority: diffDays === 0 ? 'high' : 'medium',
      iconColor: '#f59e0b',
      createdAt: bill.dueDate,
    })
  }

  // 3. Última parcela: investments/debts onde extraInfo contém "Parcela N/M" e N === M
  for (const bill of contas) {
    if (bill.extraInfo) {
      const match = bill.extraInfo.match(/Parcela\s+(\d+)\/(\d+)/i)
      if (match) {
        const current = parseInt(match[1], 10)
        const total = parseInt(match[2], 10)
        if (current > 0 && total > 0 && current === total) {
          alerts.push({
            type: 'last_installment',
            title: 'Última parcela',
            description: `${bill.description} - Parcela final ${current}/${total} (${formatBRL(bill.amount)})`,
            amount: bill.amount,
            actionUrl: '/contas?tab=a_vencer',
            actionLabel: 'Ver conta',
            priority: 'low',
            iconColor: '#8b5cf6',
            createdAt: bill.dueDate,
          })
        }
      }
    }
  }

  // 4. Faturas fechadas / prontas para revisão (status pending_review ou pending nos últimos 3 dias)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  for (const inv of invoices) {
    const isPendingReview =
      inv.status === 'pending_review' || inv.status === 'pending' || inv.status === 'parsed'
    const createdDate = inv.createdAt ? new Date(inv.createdAt) : now
    if (isPendingReview && createdDate >= threeDaysAgo) {
      const cardId = inv.cardId || inv.id
      alerts.push({
        type: 'invoice_ready',
        title: 'Fatura fechada',
        description: `Fatura de ${inv.cardName} (${formatBRL(inv.totalAmount)}) pronta para conferência`,
        amount: inv.totalAmount,
        actionUrl: `/cards/${cardId}/invoices/${inv.id}/review`,
        actionLabel: 'Revisar fatura',
        priority: 'medium',
        iconColor: '#3b82f6',
        createdAt: inv.createdAt || now.toISOString(),
      })
    }
  }

  // 5. Saldo rotativo: invoices com status='partial'
  for (const inv of invoices) {
    if (inv.status === 'partial') {
      const cardId = inv.cardId || inv.id
      alerts.push({
        type: 'rotativo',
        title: 'Saldo rotativo',
        description: `Fatura de ${inv.cardName} em aberto no crédito rotativo (${formatBRL(inv.totalAmount)})`,
        amount: inv.totalAmount,
        actionUrl: `/cards/${cardId}`,
        actionLabel: 'Ver cartão',
        priority: 'medium',
        iconColor: '#f97316',
        createdAt: inv.createdAt || now.toISOString(),
      })
    }
  }

  // 6. Orçamentos: 80% (budget_warning) e 100% (budget_exceeded)
  for (const b of budgets) {
    if (b.limit <= 0) continue
    const pct = (b.spent / b.limit) * 100
    if (pct >= 100) {
      alerts.push({
        type: 'budget_exceeded',
        title: 'Orçamento estourado',
        description: `${b.categoryName}: gasto ${formatBRL(b.spent)} de ${formatBRL(b.limit)} (${Math.round(pct)}%)`,
        amount: b.spent,
        actionUrl: '/orcamentos',
        actionLabel: 'Ver orçamento',
        priority: 'high',
        iconColor: '#ef4444',
        createdAt: now.toISOString(),
      })
    } else if (pct >= 80) {
      alerts.push({
        type: 'budget_warning',
        title: 'Orçamento quase no limite',
        description: `${b.categoryName}: gasto ${formatBRL(b.spent)} de ${formatBRL(b.limit)} (${Math.round(pct)}%)`,
        amount: b.spent,
        actionUrl: '/orcamentos',
        actionLabel: 'Ver orçamento',
        priority: 'medium',
        iconColor: '#f59e0b',
        createdAt: now.toISOString(),
      })
    }
  }

  return alerts
}
