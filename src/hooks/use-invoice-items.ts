import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getInvoiceItemsByInvoiceId } from '@/services/invoice-items'
import type { InvoiceItemRecord } from '@/types/finance'

export function useInvoiceItems(invoiceId: string | undefined) {
  const [items, setItems] = useState<InvoiceItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!invoiceId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getInvoiceItemsByInvoiceId(invoiceId)
      setItems(data)
    } catch {
      setError('Erro ao carregar itens')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('invoice_items', () => {
    loadData()
  })

  return { items, loading, error, refetch: loadData }
}
