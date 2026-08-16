import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getSavingsGoalsByFamilyId } from '@/services/savings-goals'
import type { SavingsGoal } from '@/types/finance'

export function useSavingsGoals(familyId: string | undefined) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setGoals([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getSavingsGoalsByFamilyId(familyId)
      setGoals(data)
    } catch {
      setError('Erro ao carregar metas de economia')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('savings_goals', () => {
    loadData()
  })

  return { goals, loading, error, refetch: loadData }
}
