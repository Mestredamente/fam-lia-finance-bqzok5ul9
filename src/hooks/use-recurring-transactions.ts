import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getRecurringTransactionsByFamilyId } from '@/services/recurring-transactions'
import type { RecurringTransaction } from '@/types/finance'

export function useRecurringTransactions(familyId: string | undefined) {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setRecurring([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getRecurringTransactionsByFamilyId(familyId)
      setRecurring(data)
    } catch {
      setError('Erro ao carregar transações recorrentes')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('recurring_transactions', () => {
    loadData()
  })

  return { recurring, loading, error, refetch: loadData }
}
