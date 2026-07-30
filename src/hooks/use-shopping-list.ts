import { useState, useEffect, useCallback } from 'react'
import { updateTask } from '@/services/household-tasks'
import type { ShoppingItem } from '@/types/household-tasks'

export function useShoppingList(taskId: string | undefined, initialItems: ShoppingItem[]) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setItems(initialItems || [])
  }, [JSON.stringify(initialItems)])

  const persist = useCallback(
    async (newItems: ShoppingItem[], revertItems: ShoppingItem[]) => {
      if (!taskId) return
      setLoading(true)
      try {
        await updateTask(taskId, { shopping_items: newItems })
      } catch {
        setItems(revertItems)
      } finally {
        setLoading(false)
      }
    },
    [taskId],
  )

  const toggleItem = useCallback(
    (id: string) => {
      const prev = items
      const newItems = prev.map((i) =>
        i.id === id
          ? {
              ...i,
              checked: !i.checked,
              actual_price: !i.checked ? i.estimated_price : null,
            }
          : i,
      )
      setItems(newItems)
      persist(newItems, prev)
    },
    [items, persist],
  )

  const updateActualPrice = useCallback(
    (id: string, price: number) => {
      const prev = items
      const newItems = prev.map((i) => (i.id === id ? { ...i, actual_price: price } : i))
      setItems(newItems)
      persist(newItems, prev)
    },
    [items, persist],
  )

  const totalEstimated = items.reduce((s, i) => s + i.estimated_price * i.quantity, 0)
  const totalActual = items
    .filter((i) => i.checked && i.actual_price != null)
    .reduce((s, i) => s + (i.actual_price || 0) * i.quantity, 0)

  return { items, toggleItem, updateActualPrice, totalEstimated, totalActual, loading }
}
