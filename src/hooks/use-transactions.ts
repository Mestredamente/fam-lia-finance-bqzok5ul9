import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import type { TransactionRecord } from '@/types/finance'

export function useTransactions(
  familyId: string | undefined,
  year: number,
  month: number,
  memberId?: string,
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
      const data = await getTransactionsByFamilyAndMonth(familyId, year, month, memberId)
      setTransactions(data)
    } catch {
      setError('Erro ao carregar transações')
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

  return { transactions, setTransactions, loading, error, refetch: loadData }
}
