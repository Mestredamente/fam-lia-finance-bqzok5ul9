import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getRulesByFamilyId } from '@/services/categorization-rules'
import type { CategorizationRuleRecord } from '@/types/categorization-rules'

export function useCategorizationRules(familyId: string | undefined) {
  const [rules, setRules] = useState<CategorizationRuleRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setRules([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getRulesByFamilyId(familyId)
      setRules(data)
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('categorization_rules', () => {
    loadData()
  })

  return { rules, loading, refetch: loadData }
}
