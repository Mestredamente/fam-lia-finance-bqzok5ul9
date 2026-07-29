import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getInvoicesByCardId } from '@/services/invoices'
import type { InvoiceRecord } from '@/types/finance'

export function useInvoices(cardId: string | undefined) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!cardId) {
      setInvoices([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getInvoicesByCardId(cardId)
      setInvoices(data)
    } catch {
      setError('Erro ao carregar faturas')
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('invoices', () => {
    loadData()
  })

  return { invoices, loading, error, refetch: loadData }
}
