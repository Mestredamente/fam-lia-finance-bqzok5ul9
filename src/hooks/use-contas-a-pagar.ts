import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getRecurringTransactionsByFamilyId } from '@/services/recurring-transactions'
import { getInvestmentsByFamilyId } from '@/services/investments'
import { getDebtsByFamilyId } from '@/services/debts'
import pb from '@/lib/pocketbase/client'
import type {
  BillItem,
  BillSummary,
  BillStatus,
  TransactionRecord,
  TransactionSource,
} from '@/types/finance'

/**
 * Consolidates upcoming bills from three sources into a single read-only view:
 *  - active recurring_transactions → next occurrence (day_of_month)
 *  - active investments with installments → next installment (installment_due_day)
 *  - active debts → next due date (due_day)
 *
 * A bill is considered "paga" when a transaction with the matching origin id
 * already exists in the current month. Otherwise its status is derived from
 * the due date: vencida (past), a_vencer (next 7 days) or futura (later).
 */
export function useContasAPagar(familyId: string | undefined) {
  const [contas, setContas] = useState<BillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setContas([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      // Current month window (UTC midnight boundaries — matches the cron's
      // transaction_date filter style).
      const startOfMonth = new Date(Date.UTC(year, month, 1))
      const endOfMonth = new Date(Date.UTC(year, month + 1, 1))
      const startISO = startOfMonth.toISOString()
      const endISO = endOfMonth.toISOString()

      const [recurring, investments, debts] = await Promise.all([
        getRecurringTransactionsByFamilyId(familyId),
        getInvestmentsByFamilyId(familyId),
        getDebtsByFamilyId(familyId),
      ])

      // Pull all transactions for the current month once, then partition by
      // the origin id we care about (recurring_id / investment_id / debt_id).
      const monthTx = await pb.collection('transactions').getFullList<TransactionRecord>({
        filter: `family_id = "${familyId}" && transaction_date >= "${startISO}" && transaction_date < "${endISO}"`,
      })

      const txByRecurring = new Map<string, TransactionRecord>()
      const txByInvestment = new Map<string, TransactionRecord>()
      const txByDebt = new Map<string, TransactionRecord>()
      for (const t of monthTx) {
        if (t.recurring_id) txByRecurring.set(t.recurring_id, t)
        if (t.investment_id) txByInvestment.set(t.investment_id, t)
        if (t.debt_id) txByDebt.set(t.debt_id, t)
      }

      const items: BillItem[] = []

      // ── Recurring transactions ──
      for (const r of recurring) {
        if (!r.active) continue
        if (r.frequency !== 'monthly') {
          // weekly/yearly cadence is handled by the cron; for the bills view we
          // only show monthly ones (predictable monthly due date).
          // Still include them using day_of_month for completeness.
        }
        const day = r.day_of_month
        if (!day || day < 1 || day > 31) continue
        const dueDate = computeDueDate(day, now)
        const paidTx = txByRecurring.get(r.id)
        const status = paidTx ? 'paga' : deriveStatus(dueDate, now)
        items.push({
          id: `recurring-${r.id}`,
          description: r.description,
          amount: r.amount,
          dueDate: dueDate.toISOString(),
          source: 'recurring',
          status,
          originId: r.id,
          categoryId: r.category_id || undefined,
          type: r.type === 'receita' ? 'income' : 'expense',
          paidDate: paidTx?.transaction_date,
          transactionId: paidTx?.id,
        })
      }

      // ── Investments with installments ──
      for (const inv of investments) {
        if (!inv.is_active) continue
        const total = inv.installments_total ?? 0
        const paid = inv.installments_paid ?? 0
        if (total <= 0 || paid >= total) continue
        const dueDay = inv.installment_due_day
        if (!dueDay || dueDay < 1 || dueDay > 31) continue
        const dueDate = computeDueDate(dueDay, now)
        const paidTx = txByInvestment.get(inv.id)
        const status = paidTx ? 'paga' : deriveStatus(dueDate, now)
        items.push({
          id: `investment-${inv.id}`,
          description: inv.name,
          amount: inv.installment_value ?? inv.amount_invested ?? 0,
          dueDate: dueDate.toISOString(),
          source: 'investment',
          status,
          originId: inv.id,
          extraInfo: `Parcela ${paid + 1}/${total}`,
          categoryId: inv.expense_category_id || inv.category_id || undefined,
          type: 'expense',
          paidDate: paidTx?.transaction_date,
          transactionId: paidTx?.id,
        })
      }

      // ── Debts ──
      for (const d of debts) {
        if (!d.is_active) continue
        if (d.status === 'paid_off') continue
        const dueDay = d.due_day
        if (!dueDay || dueDay < 1 || dueDay > 31) continue
        const dueDate = computeDueDate(dueDay, now)
        const paidTx = txByDebt.get(d.id)
        const status = paidTx ? 'paga' : deriveStatus(dueDate, now)
        const total = d.installments_total ?? 0
        const paid = d.installments_paid ?? 0
        items.push({
          id: `debt-${d.id}`,
          description: d.description,
          amount: d.installment_value ?? 0,
          dueDate: dueDate.toISOString(),
          source: 'debt',
          status,
          originId: d.id,
          extraInfo: total > 0 ? `Parcela ${paid + 1}/${total}` : undefined,
          categoryId: d.category_id || undefined,
          type: 'expense',
          paidDate: paidTx?.transaction_date,
          transactionId: paidTx?.id,
        })
      }

      // Sort by due date ascending; paid items sink to the bottom of their
      // equal-date group so upcoming bills surface first.
      items.sort((a, b) => {
        const da = new Date(a.dueDate).getTime()
        const db = new Date(b.dueDate).getTime()
        if (da !== db) return da - db
        if (a.status === 'paga' && b.status !== 'paga') return 1
        if (a.status !== 'paga' && b.status === 'paga') return -1
        return 0
      })

      setContas(items)
    } catch {
      setError('Erro ao carregar contas a pagar')
      setContas([])
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => loadData())
  useRealtime('recurring_transactions', () => loadData())
  useRealtime('investments', () => loadData())
  useRealtime('debts', () => loadData())

  const summary = useMemo<BillSummary>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const inMonth = contas.filter((c) => {
      const d = new Date(c.dueDate)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const pagas = inMonth.filter((c) => c.status === 'paga')
    const vencidas = inMonth.filter((c) => c.status === 'vencida')
    const restante = inMonth.filter((c) => c.status !== 'paga')
    return {
      totalMes: inMonth.reduce((s, c) => s + c.amount, 0),
      totalPagas: pagas.reduce((s, c) => s + c.amount, 0),
      countPagas: pagas.length,
      totalRestante: restante.reduce((s, c) => s + c.amount, 0),
      countRestante: restante.length,
      totalVencidas: vencidas.reduce((s, c) => s + c.amount, 0),
      countVencidas: vencidas.length,
    }
  }, [contas])

  return { contas, summary, loading, error, refetch: loadData }
}

/**
 * Returns the next occurrence of a monthly bill due on `day` on/after the
 * reference date. If `day` >= today's day-of-month, the bill is due this
 * month (today or later this month); otherwise it rolls to next month.
 */
function computeDueDate(day: number, ref: Date): Date {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  let year = today.getFullYear()
  let month = today.getMonth()
  let due = new Date(year, month, day, 12, 0, 0, 0)
  if (due < today) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
    due = new Date(year, month, day, 12, 0, 0, 0)
  }
  return due
}

function deriveStatus(dueDate: Date, now: Date): BillStatus {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const diffMs = due.getTime() - today.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'vencida'
  if (diffDays <= 7) return 'a_vencer'
  return 'futura'
}

/**
 * Builds the transaction payload to mark a bill as paid. Mirrors the cron's
 * record creation (source + origin id) so the same dedup logic applies on
 * refetch. Returns null when the bill is already paid.
 */
export function buildBillPaymentPayload(
  bill: BillItem,
  familyId: string,
  ownerId: string,
): Record<string, unknown> | null {
  if (bill.transactionId) return null
  const base: Record<string, unknown> = {
    family_id: familyId,
    owner_id: ownerId,
    type: bill.type,
    amount: bill.amount,
    description: bill.description,
    transaction_date: new Date().toISOString(),
    is_shared: false,
    is_fixed: true,
    status: 'paid',
    ...(bill.categoryId ? { category_id: bill.categoryId } : {}),
  }
  if (bill.source === 'recurring') {
    base.source = 'recurring' as TransactionSource
    base.recurring_id = bill.originId
  } else if (bill.source === 'investment') {
    base.source = 'investment' as TransactionSource
    base.investment_id = bill.originId
  } else {
    base.source = 'recurring_debt' as TransactionSource
    base.debt_id = bill.originId
  }
  return base
}
