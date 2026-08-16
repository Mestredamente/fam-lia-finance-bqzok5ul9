import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getTransactionsByFamilyAndPeriod,
  getTransactionsCountOutsideRange,
} from '@/services/transactions'
import { getPeriodRange, type PeriodType } from '@/lib/period-utils'
import { getCachedTransactions } from '@/lib/transaction-cache'
import type { TransactionRecord } from '@/types/finance'

const SUMMARY_CACHE_PREFIX = 'ff_summary_cache_v1:'

function summaryCacheKey(familyId: string, year: number, month: number, period: PeriodType) {
  return `${SUMMARY_CACHE_PREFIX}${familyId}:${year}:${month}:${period}`
}

export interface MemberSummary {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  transactionCount: number
  transactions: TransactionRecord[]
}

export interface MonthlySummary {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  porcentagemGasta: number
  memberSummaries: Record<string, MemberSummary>
}

export function useMonthlySummary(
  familyId: string | undefined,
  year: number,
  month: number,
  period: PeriodType = 'mes',
) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [otherMonthsCount, setOtherMonthsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTransactions([])
      setOtherMonthsCount(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const range = getPeriodRange(period, year, month)
      const data = await getTransactionsByFamilyAndPeriod(familyId, range.startDate, range.endDate)
      setTransactions(data)
      // Mirror the fetched transactions for offline resilience.
      try {
        localStorage.setItem(summaryCacheKey(familyId, year, month, period), JSON.stringify(data))
      } catch {
        /* storage full — best effort */
      }

      if (period === 'tudo' || !range.startDate || !range.endDate) {
        setOtherMonthsCount(0)
      } else {
        try {
          const count = await getTransactionsCountOutsideRange(
            familyId,
            range.startDate,
            range.endDate,
          )
          setOtherMonthsCount(count)
        } catch {
          setOtherMonthsCount(0)
        }
      }
    } catch {
      // Offline / network error: fall back to the last cached payload so the
      // dashboard keeps showing data instead of going blank.
      try {
        const raw = localStorage.getItem(summaryCacheKey(familyId, year, month, period))
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setTransactions(parsed as TransactionRecord[])
            setError(null)
            setOtherMonthsCount(0)
            return
          }
        }
      } catch {
        /* ignore */
      }
      // Last resort: try the per-month transaction cache.
      const fallback = getCachedTransactions(familyId, year, month)
      if (fallback.length > 0) {
        setTransactions(fallback)
        setError(null)
      } else {
        setError('Erro ao carregar resumo. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }, [familyId, year, month, period])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    loadData()
  })

  // Reload fresh data when offline writes have been synced or when connectivity
  // returns, so the dashboard stops showing the cached/offline snapshot.
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

  const summary = useMemo<MonthlySummary>(() => {
    const totalReceitas = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const totalDespesas = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const saldo = totalReceitas - totalDespesas
    const porcentagemGasta =
      totalReceitas > 0 ? Math.min((totalDespesas / totalReceitas) * 100, 100) : 0

    const memberSummaries: Record<string, MemberSummary> = {}
    for (const t of transactions) {
      if (!memberSummaries[t.owner_id]) {
        memberSummaries[t.owner_id] = {
          totalReceitas: 0,
          totalDespesas: 0,
          saldo: 0,
          transactionCount: 0,
          transactions: [],
        }
      }
      const ms = memberSummaries[t.owner_id]
      ms.transactionCount++
      ms.transactions.push(t)
      if (t.type === 'income') ms.totalReceitas += t.amount
      if (t.type === 'expense') ms.totalDespesas += t.amount
    }
    for (const ms of Object.values(memberSummaries)) {
      ms.saldo = ms.totalReceitas - ms.totalDespesas
      ms.transactions.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      ms.transactions = ms.transactions.slice(0, 5)
    }

    return { totalReceitas, totalDespesas, saldo, porcentagemGasta, memberSummaries }
  }, [transactions])

  return { summary, transactions, loading, error, refetch: loadData, otherMonthsCount }
}
