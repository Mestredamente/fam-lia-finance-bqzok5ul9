import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getPendingInvoicesCount } from '@/services/invoices'

export function usePendingInvoicesCount(familyId: string | undefined) {
  const [count, setCount] = useState(0)

  const loadCount = useCallback(async () => {
    if (!familyId) {
      setCount(0)
      return
    }
    try {
      const c = await getPendingInvoicesCount(familyId)
      setCount(c)
    } catch {
      setCount(0)
    }
  }, [familyId])

  useEffect(() => {
    loadCount()
  }, [loadCount])
  useRealtime('invoices', () => {
    loadCount()
  })

  return count
}
