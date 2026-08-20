import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getRecurringTransactionsByFamilyId } from '@/services/recurring-transactions'
import { getInvestmentsByFamilyId } from '@/services/investments'
import { getDebtsByFamilyId } from '@/services/debts'
import { getInvoicesByFamilyId } from '@/services/invoices'
import { getCreditCardsByFamilyId } from '@/services/credit-cards'
import pb from '@/lib/pocketbase/client'
import type {
  BillItem,
  BillSummary,
  BillStatus,
  InvoiceRecord,
  TransactionRecord,
  TransactionSource,
} from '@/types/finance'

/**
 * Consolidates upcoming bills from four sources into a single read-only view:
 *  - active recurring_transactions → next occurrence (day_of_month)
 *  - active investments with installments → next installment (installment_due_day)
 *  - active debts → next due date (due_day)
 *  - unpaid card invoices → the invoice's due date (month_ref + card due_day)
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

      const [recurring, investments, debts, invoices, creditCards] = await Promise.all([
        getRecurringTransactionsByFamilyId(familyId),
        getInvestmentsByFamilyId(familyId),
        getDebtsByFamilyId(familyId),
        getInvoicesByFamilyId(familyId),
        getCreditCardsByFamilyId(familyId),
      ])

      const cardMap = new Map<string, (typeof creditCards)[0]>()
      for (const c of creditCards) {
        cardMap.set(c.id, c)
      }

      // Pull all transactions for the current month once, then partition by
      // the origin id we care about (recurring_id / investment_id / debt_id /
      // invoice_id).
      const monthTx = await pb.collection('transactions').getFullList<TransactionRecord>({
        filter: `family_id = "${familyId}" && transaction_date >= "${startISO}" && transaction_date < "${endISO}"`,
      })

      const txByRecurring = new Map<string, TransactionRecord>()
      const txByInvestment = new Map<string, TransactionRecord>()
      const txByDebt = new Map<string, TransactionRecord>()
      const txByInvoice = new Map<string, TransactionRecord>()
      for (const t of monthTx) {
        if (t.recurring_id) txByRecurring.set(t.recurring_id, t)
        if (t.investment_id) txByInvestment.set(t.investment_id, t)
        if (t.debt_id) txByDebt.set(t.debt_id, t)
        if (t.invoice_id) txByInvoice.set(t.invoice_id, t)
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

      // ── Card invoices (unpaid or partially paid) ──
      for (const inv of invoices) {
        // Skip invoices that are fully paid via the payment flow.
        if (inv.status === 'paid') continue
        // Only show invoices with a positive amount.
        if (!inv.total_amount || inv.total_amount <= 0) continue

        // Resolve the card (for the due day and the display name).
        const card = inv.expand?.card_id || (inv.card_id ? cardMap.get(inv.card_id) : undefined)
        const cardName = card?.name || 'Cartão'
        const dueDay = card?.due_day

        // Compute the invoice due date from the month_ref + card due_day.
        const dueDate = computeInvoiceDueDate(inv, dueDay, now)
        if (!dueDate) continue

        // Skip invoices whose due date is before the start of the current
        // month AND are not "partial" (fully stale, already-paid-history).
        // Partial invoices stay visible so the user can settle the rotativo.
        if (inv.status !== 'partial') {
          const startOfCurrentMonth = new Date(year, month, 1)
          if (dueDate < startOfCurrentMonth) continue
        }

        const paidTx = txByInvoice.get(inv.id)
        const status: BillStatus = paidTx
          ? 'paga'
          : inv.status === 'partial'
            ? 'a_vencer'
            : deriveStatus(dueDate, now)
        const monthRefLabel = formatMonthRef(inv.month_ref)
        const minimumPayment = Math.round(inv.total_amount * 0.15 * 100) / 100

        items.push({
          id: `invoice-${inv.id}`,
          description: `Fatura ${cardName} - ${monthRefLabel}`,
          amount: inv.total_amount,
          dueDate: dueDate.toISOString(),
          source: 'invoice',
          status,
          originId: inv.id,
          extraInfo: inv.status === 'partial' ? 'Pagamento parcial' : undefined,
          type: 'expense',
          paidDate: paidTx?.transaction_date,
          transactionId: paidTx?.id,
          cardId: inv.card_id,
          cardName,
          invoiceId: inv.id,
          minimumPayment,
          monthRef: inv.month_ref,
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
  useRealtime('invoices', () => loadData())
  useRealtime('credit_cards', () => loadData())

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
 * Computes the due date for a card invoice. PocketBase stores month_ref as a
 * date string ("YYYY-MM-DD 00:00:00 +00:00"); we combine its month with the
 * card's due_day to get the actual payment deadline. Returns null when the
 * invoice or card is missing the data we need.
 */
function computeInvoiceDueDate(
  inv: InvoiceRecord,
  dueDay: number | undefined,
  now: Date,
): Date | null {
  // month_ref is like "2024-08-01 00:00:00 +00:00" — take the YYYY-MM-DD part.
  const refStr = (inv.month_ref || '').split(' ')[0]
  if (!refStr) return null
  const ref = new Date(refStr + 'T12:00:00')
  if (isNaN(ref.getTime())) return null
  const day = dueDay && dueDay >= 1 && dueDay <= 31 ? dueDay : ref.getDate()
  const due = new Date(ref.getFullYear(), ref.getMonth(), day, 12, 0, 0, 0)
  return due
}

function formatMonthRef(monthRef: string): string {
  const refStr = (monthRef || '').split(' ')[0]
  if (!refStr) return ''
  const d = new Date(refStr + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  return `${months[d.getMonth()]}/${d.getFullYear()}`
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
  } else if (bill.source === 'invoice') {
    base.source = 'invoice_import' as TransactionSource
    base.invoice_id = bill.invoiceId || bill.originId
    if (bill.cardId) base.card_id = bill.cardId
  } else {
    base.source = 'recurring_debt' as TransactionSource
    base.debt_id = bill.originId
  }
  return base
}
