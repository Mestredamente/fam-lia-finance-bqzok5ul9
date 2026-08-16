import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import type { TransactionRecord } from '@/types/finance'
import { getCachedTransactions, setCachedTransactions } from '@/lib/transaction-cache'

/**
 * Loads transactions for a family/month, with offline resilience:
 *  - On a successful fetch, the result is mirrored to localStorage.
 *  - On failure (e.g. offline), the last cached payload for this month is
 *    shown instead of an empty list, and `error` stays null.
 *  - Pending offline transactions (queued via useOfflineQueue) are merged on
 *    top so the user sees what they just created.
 *  - When a sync completes (ff-offline-synced) or connectivity returns, data
 *    is reloaded fresh.
 */
export function useTransactions(
  familyId: string | undefined,
  year: number,
  month: number,
  memberId?: string,
) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { pendingTransactions } = useOfflineQueue()

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getTransactionsByFamilyAndMonth(familyId, year, month, memberId)
      setTransactions(data)
      setCachedTransactions(familyId, year, month, memberId, data)
    } catch {
      // Offline / network error: fall back to the last cached payload.
      const cached = getCachedTransactions(familyId, year, month, memberId)
      if (cached.length > 0) {
        setTransactions(cached)
        setError(null)
      } else {
        setError('Erro ao carregar transações')
      }
    } finally {
      setLoading(false)
    }
  }, [familyId, year, month, memberId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    loadData()
  })

  // Reload fresh data when the offline queue has been synced.
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

  // Merge pending (offline) transactions on top of the loaded list so the
  // user immediately sees what they just saved. Pending rows use a synthetic
  // tempId so the UI can render a "pending" badge.
  const withPending = mergePending(transactions, pendingTransactions, year, month, memberId)

  return { transactions: withPending, setTransactions, loading, error, refetch: loadData }
}

function mergePending(
  loaded: TransactionRecord[],
  pending: ReturnType<typeof useOfflineQueue>['pendingTransactions'],
  year: number,
  month: number,
  memberId?: string,
): TransactionRecord[] {
  if (pending.length === 0) return loaded
  const relevant = pending.filter((p) => {
    const d = p.data.transaction_date
    if (!d) return false
    const date = new Date(d)
    if (date.getFullYear() !== year || date.getMonth() !== month) return false
    if (memberId && p.data.owner_id !== memberId) return false
    return true
  })
  if (relevant.length === 0) return loaded
  const asRecords: TransactionRecord[] = relevant.map((p) => ({
    id: p.tempId,
    family_id: (p.data.family_id as string) || '',
    owner_id: (p.data.owner_id as string) || '',
    category_id: (p.data.category_id as string) || '',
    type: (p.data.type as TransactionRecord['type']) || 'expense',
    amount: (p.data.amount as number) || 0,
    description: (p.data.description as string) || '',
    transaction_date: (p.data.transaction_date as string) || p.queuedAt,
    is_shared: !!p.data.is_shared,
    is_fixed: !!p.data.is_fixed,
    source: (p.data.source as TransactionRecord['source']) || 'manual',
    status: 'pending',
    created: p.queuedAt,
    updated: p.queuedAt,
    expand: {},
  }))
  return [...asRecords, ...loaded]
}
