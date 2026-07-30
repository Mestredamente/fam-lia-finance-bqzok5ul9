import { useState, useCallback, useRef } from 'react'
import { getEmotionalAnalysis, type AnalysisResponse } from '@/services/emotional-analysis'
import type { EmotionalAnalysisResult } from '@/types/finance'

const CACHE_DURATION = 30 * 60 * 1000

export function useEmotionalAnalysis(memberId: string | undefined, familyId: string | undefined) {
  const [analysis, setAnalysis] = useState<EmotionalAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<{ data: EmotionalAnalysisResult | null; timestamp: number }>({
    data: null,
    timestamp: 0,
  })

  const loadData = useCallback(async () => {
    if (!memberId || !familyId) return
    const now = Date.now()
    if (cacheRef.current.data && now - cacheRef.current.timestamp < CACHE_DURATION) {
      setAnalysis(cacheRef.current.data)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getEmotionalAnalysis(familyId, memberId)
      if ('analysis' in result) {
        setAnalysis(result.analysis)
        cacheRef.current = { data: result.analysis, timestamp: now }
      } else {
        setError(result.error || 'Erro ao carregar análise')
      }
    } catch {
      setError('Erro ao carregar análise')
    } finally {
      setLoading(false)
    }
  }, [memberId, familyId])

  const refetch = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 }
    loadData()
  }, [loadData])

  return { analysis, loading, error, refetch, fetchAnalysis: loadData }
}
