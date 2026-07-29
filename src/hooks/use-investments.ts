import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getInvestmentsByFamilyId } from '@/services/investments'
import type { InvestmentRecord } from '@/types/finance'

export function useInvestments(familyId: string | undefined, memberId?: string) {
  const [investments, setInvestments] = useState<InvestmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setInvestments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getInvestmentsByFamilyId(familyId, memberId)
      setInvestments(data)
    } catch {
      setError('Erro ao carregar investimentos')
    } finally {
      setLoading(false)
    }
  }, [familyId, memberId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('investments', () => {
    loadData()
  })

  const summary = useMemo(() => {
    const totalInvested = investments.reduce((s, i) => s + i.amount_invested, 0)
    const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0)
    const totalReturn = totalCurrent - totalInvested
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0
    return { totalInvested, totalCurrent, totalReturn, returnPercentage }
  }, [investments])

  return {
    investments,
    ...summary,
    loading,
    error,
    refetch: loadData,
  }
}
