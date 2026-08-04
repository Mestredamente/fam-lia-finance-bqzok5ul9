import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getFutureInstallments } from '@/services/future-installments'
import type { TransactionRecord } from '@/types/finance'

export function useFutureInstallments(familyId: string | undefined) {
  const [installments, setInstallments] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setInstallments([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getFutureInstallments(familyId)
      setInstallments(data)
    } catch {
      setInstallments([])
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    loadData()
  })

  return { installments, loading }
}
