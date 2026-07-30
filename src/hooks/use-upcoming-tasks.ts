import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getUpcomingAndOverdueTasks } from '@/services/household-tasks'
import type { HouseholdTaskRecord } from '@/types/household-tasks'

export function useUpcomingTasks(familyId: string | undefined, daysAhead: number = 7) {
  const [tasks, setTasks] = useState<HouseholdTaskRecord[]>([])
  const [overdueCount, setOverdueCount] = useState(0)
  const [totalEstimatedCost, setTotalEstimatedCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getUpcomingAndOverdueTasks(familyId, daysAhead)
      const todayStr = new Date().toISOString().split('T')[0]
      const upcoming = data.filter((t) => (t.due_date?.split('T')[0] || '') >= todayStr).slice(0, 5)
      const overdue = data.filter((t) => (t.due_date?.split('T')[0] || '') < todayStr)
      setTasks(upcoming)
      setOverdueCount(overdue.length)
      setTotalEstimatedCost(data.reduce((s, t) => s + (t.estimated_cost || 0), 0))
    } catch {
      setError('Erro ao carregar compromissos')
    } finally {
      setLoading(false)
    }
  }, [familyId, daysAhead])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('household_tasks', () => {
    loadData()
  })

  return { tasks, totalEstimatedCost, overdueCount, loading, error }
}
