import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getTasksByFamilyId,
  createTask as createTaskSvc,
  updateTask as updateTaskSvc,
  deleteTask as deleteTaskSvc,
  completeTaskService,
} from '@/services/household-tasks'
import type {
  HouseholdTaskRecord,
  HouseholdTaskFilters,
  CompleteTaskOptions,
  CompleteTaskResult,
} from '@/types/household-tasks'

export function useHouseholdTasks(familyId: string | undefined, filters?: HouseholdTaskFilters) {
  const [tasks, setTasks] = useState<HouseholdTaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filterKey = JSON.stringify(filters)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = JSON.parse(filterKey) as HouseholdTaskFilters
      const data = await getTasksByFamilyId(familyId, parsed)
      setTasks(data)
    } catch {
      setError('Erro ao carregar tarefas')
    } finally {
      setLoading(false)
    }
  }, [familyId, filterKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('household_tasks', () => {
    loadData()
  })

  const createTask = useCallback(async (data: Partial<HouseholdTaskRecord>) => {
    return createTaskSvc(data)
  }, [])

  const updateTask = useCallback(
    async (id: string, data: Partial<HouseholdTaskRecord>) => {
      const prev = tasks
      setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...data } : t)))
      try {
        return await updateTaskSvc(id, data)
      } catch {
        setTasks(prev)
        throw new Error('Erro ao atualizar tarefa')
      }
    },
    [tasks],
  )

  const completeTask = useCallback(
    async (
      taskId: string,
      familyId: string,
      options: CompleteTaskOptions,
    ): Promise<CompleteTaskResult> => {
      const prev = tasks
      setTasks((p) =>
        p.map((t) =>
          t.id === taskId
            ? { ...t, status: 'completed' as const, completed_at: new Date().toISOString() }
            : t,
        ),
      )
      try {
        return await completeTaskService(taskId, familyId, options)
      } catch {
        setTasks(prev)
        throw new Error('Erro ao concluir tarefa')
      }
    },
    [tasks],
  )

  const cancelTask = useCallback(
    async (id: string) => {
      const prev = tasks
      setTasks((p) => p.map((t) => (t.id === id ? { ...t, status: 'cancelled' as const } : t)))
      try {
        await updateTaskSvc(id, { status: 'cancelled' })
      } catch {
        setTasks(prev)
        throw new Error('Erro ao cancelar tarefa')
      }
    },
    [tasks],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      const prev = tasks
      setTasks((p) => p.filter((t) => t.id !== id))
      try {
        await deleteTaskSvc(id)
      } catch {
        setTasks(prev)
        throw new Error('Erro ao excluir tarefa')
      }
    },
    [tasks],
  )

  return {
    tasks,
    loading,
    error,
    refetch: loadData,
    createTask,
    updateTask,
    completeTask,
    cancelTask,
    deleteTask,
  }
}
