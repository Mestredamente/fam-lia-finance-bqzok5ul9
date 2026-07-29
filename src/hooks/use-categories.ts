import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getCategoriesByFamilyId } from '@/services/categories'
import type { CategoryRecord } from '@/types/finance'

export function useCategories(familyId: string | undefined) {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getCategoriesByFamilyId(familyId)
      setCategories(data)
    } catch {
      setError('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('categories', () => {
    loadData()
  })

  return { categories, loading, error, refetch: loadData }
}
