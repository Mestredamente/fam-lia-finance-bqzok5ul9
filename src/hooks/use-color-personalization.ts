import { useState, useEffect, useCallback } from 'react'
import { getTransactionsByFamilyAndDateRange } from '@/services/transactions'

export function useColorPersonalization(familyId: string | undefined) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('ff_color_personalization') === 'true'
    } catch {
      return false
    }
  })
  const [primaryColor, setPrimaryColor] = useState<string | null>(null)

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem('ff_color_personalization', String(next))
      } catch {
        /* intentionally ignored */
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!familyId || !enabled) {
      setPrimaryColor(null)
      return
    }
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
    const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    getTransactionsByFamilyAndDateRange(familyId, startDate, endDate)
      .then((txs) => {
        const byCat: Record<string, { amount: number; color: string }> = {}
        for (const t of txs) {
          if (t.type !== 'expense') continue
          const cat = t.expand?.category_id
          if (!cat) continue
          if (!byCat[cat.id]) byCat[cat.id] = { amount: 0, color: cat.color || '#999' }
          byCat[cat.id].amount += t.amount
        }
        const sorted = Object.values(byCat).sort((a, b) => b.amount - a.amount)
        if (sorted[0]) setPrimaryColor(sorted[0].color)
      })
      .catch(() => {})
  }, [familyId, enabled])

  return { enabled, toggle, primaryColor: enabled ? primaryColor : null }
}
