import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getBudgetsByFamilyId } from '@/services/budgets'
import type { BudgetRecord } from '@/types/budgets'

export function useBudgets(familyId: string | undefined) {
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setBudgets([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setBudgets(await getBudgetsByFamilyId(familyId))
    } catch {
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('budgets', () => {
    loadData()
  })

  return { budgets, loading, refetch: loadData }
}
