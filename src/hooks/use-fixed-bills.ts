import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getFixedBillsByFamilyAndMonth } from '@/services/transactions'
import type { TransactionRecord } from '@/types/finance'

export function useFixedBills(familyId: string | undefined, year: number, month: number) {
  const [fixedBills, setFixedBills] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setFixedBills([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getFixedBillsByFamilyAndMonth(familyId, year, month)
      setFixedBills(data)
    } catch {
      setError('Erro ao carregar contas fixas')
    } finally {
      setLoading(false)
    }
  }, [familyId, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    loadData()
  })

  const { totalPaid, totalPending } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const paid = fixedBills.filter((t) => {
      const d = new Date(t.transaction_date)
      d.setHours(0, 0, 0, 0)
      return d < today
    }).length
    return { totalPaid: paid, totalPending: fixedBills.length - paid }
  }, [fixedBills])

  return { fixedBills, totalPaid, totalPending, loading, error, refetch: loadData }
}
