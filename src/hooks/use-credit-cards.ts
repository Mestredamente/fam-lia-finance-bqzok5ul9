import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getCreditCardsByFamilyId } from '@/services/credit-cards'
import type { CreditCardRecord } from '@/types/finance'

export function useCreditCards(familyId: string | undefined) {
  const [cards, setCards] = useState<CreditCardRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setCards([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getCreditCardsByFamilyId(familyId)
      setCards(data)
    } catch {
      setError('Erro ao carregar cartões')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('credit_cards', () => {
    loadData()
  })

  return { cards, loading, error, refetch: loadData }
}
