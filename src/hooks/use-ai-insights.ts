import { useState, useEffect, useCallback, useRef } from 'react'
import { getInsights } from '@/services/ai-advisor'
import type { AIInsight } from '@/types/finance'

const CACHE_DURATION = 30 * 60 * 1000

export function useAIInsights(familyId: string | undefined, memberId: string | undefined) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef(0)

  const fetchInsights = useCallback(
    async (force = false) => {
      if (!familyId || !memberId) {
        setLoading(false)
        return
      }
      if (!force && Date.now() - lastFetchRef.current < CACHE_DURATION && insights.length > 0) {
        return
      }

      setLoading(true)
      setError(null)
      try {
        const result = await getInsights(familyId, memberId)
        if ('error' in result) {
          setError(result.error)
          setInsights([])
        } else if (result.insights && Array.isArray(result.insights)) {
          setInsights(result.insights)
        } else {
          setInsights([])
        }
        lastFetchRef.current = Date.now()
      } catch {
        setError('Não foi possível carregar os insights.')
        setInsights([])
      } finally {
        setLoading(false)
      }
    },
    [familyId, memberId, insights.length],
  )

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return { insights, loading, error, refetch: () => fetchInsights(true) }
}
