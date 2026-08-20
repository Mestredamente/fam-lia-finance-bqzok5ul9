import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getTransactionsByFamilyAndMonth,
  getTransactionsByFamilyAndDateRange,
} from '@/services/transactions'
import type { TransactionRecord } from '@/types/finance'
import { fixMojibake } from '@/lib/utils'

export type PeriodFilter = 'today' | 'week' | 'fortnight' | 'month'

/** Returns the inclusive start / exclusive end ISO strings for a period
 *  anchored to "today" (used by today/week/fortnight). */
export function getPeriodRange(period: PeriodFilter): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  // Add one day so the exclusive end covers all of "today".
  const exclEnd = new Date(end)
  exclEnd.setDate(exclEnd.getDate() + 1)
  exclEnd.setHours(0, 0, 0, 0)

  if (period === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { start: toISO(start), end: toISO(exclEnd) }
  }
  if (period === 'week') {
    // Sunday-Saturday. JS getDay(): 0 = Sunday.
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay())
    return { start: toISO(start), end: toISO(exclEnd) }
  }
  // fortnight: last 15 days including today
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 14)
  return { start: toISO(start), end: toISO(exclEnd) }
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day} 00:00:00`
}

/**
 * Loads transactions for a family+period.
 *
 * - period === 'month'  → uses the month/year (existing behaviour, default).
 * - period === 'today' / 'week' / 'fortnight' → loads by a date range anchored
 *   to the current date, ignoring the selected month.
 *
 * Realtime + offline-sync events trigger a refetch just like useTransactions.
 */
export function useTransactionsForPeriod(
  familyId: string | undefined,
  period: PeriodFilter,
  year: number,
  month: number,
) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      let data: TransactionRecord[]
      if (period === 'month') {
        data = await getTransactionsByFamilyAndMonth(familyId, year, month)
      } else {
        const { start, end } = getPeriodRange(period)
        data = await getTransactionsByFamilyAndDateRange(familyId, start, end)
      }
      setTransactions(
        data.map((tx) => ({
          ...tx,
          description: fixMojibake(tx.description),
        })),
      )
    } catch {
      setError('Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [familyId, period, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    loadData()
  })

  useEffect(() => {
    const onSynced = () => loadData()
    const onOnline = () => loadData()
    window.addEventListener('ff-offline-synced', onSynced)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('ff-offline-synced', onSynced)
      window.removeEventListener('online', onOnline)
    }
  }, [loadData])

  return { transactions, setTransactions, loading, error, refetch: loadData }
}
