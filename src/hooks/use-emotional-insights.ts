import { useState, useEffect, useCallback, useRef } from 'react'
import { getEmotionalInsights, type EmotionalInsightsContext } from '@/services/ai-advisor'
import type { AIInsight } from '@/types/finance'

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutos

/**
 * Hook que busca insights emocionais gerados pela IA (Gemini) com cache de 30min.
 *
 * - Se `enabled` for false (< 5 transações com emoção) ou `context` for null,
 *   NÃO chama a IA e retorna array vazio — o componente deve mostrar o fallback
 *   estático (mensagem incentivando o registro de emoções).
 * - Se a IA falhar (timeout, erro, array vazio), retorna array vazio e o
 *   componente usa o `staticFallback`.
 */
export function useEmotionalInsights(
  familyId: string | undefined,
  memberId: string | undefined,
  context: EmotionalInsightsContext | null, // null quando não há dados suficientes
  staticFallback: string[], // insights estáticos (fallback)
  enabled: boolean, // false quando < 5 transações com emoção
) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef(0)
  const lastContextRef = useRef<EmotionalInsightsContext | null>(null)

  const fetchInsights = useCallback(async () => {
    if (!familyId || !memberId || !context || !enabled) {
      setInsights([])
      return
    }
    // Re-fetch quando o contexto muda (mês/ano diferente) ou cache expirou
    const contextChanged = lastContextRef.current !== context
    if (
      !contextChanged &&
      Date.now() - lastFetchRef.current < CACHE_DURATION &&
      insights.length > 0
    ) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getEmotionalInsights(familyId, memberId, context)
      if ('error' in result || !('insights' in result)) {
        setInsights([])
      } else if (result.insights && Array.isArray(result.insights) && result.insights.length > 0) {
        setInsights(result.insights)
      } else {
        setInsights([])
      }
      lastFetchRef.current = Date.now()
      lastContextRef.current = context
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }, [familyId, memberId, context, enabled, insights.length])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // Se a IA não retornou insights (vazio, erro, carregando), usar fallback estático
  const effectiveInsights: string[] =
    insights.length > 0
      ? insights.map((i) => `${i.titulo}: ${i.descricao}`) // fallback textual para os componentes que esperam string[]
      : staticFallback

  return {
    aiInsights: insights as AIInsight[], // array completo com tipo
    effectiveInsights, // string[] para os componentes antigos
    loading,
    error,
  }
}
