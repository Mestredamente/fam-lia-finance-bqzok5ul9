import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBudgets } from '@/hooks/use-budgets'
import { useRealtime } from '@/hooks/use-realtime'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface Props {
  familyId: string
  year: number
  month: number
  primaryColor?: string | null
}

export function BudgetProgressSection({ familyId, year, month, primaryColor }: Props) {
  const { budgets, loading: budgetsLoading } = useBudgets(familyId)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!familyId) return
    try {
      setTransactions(await getTransactionsByFamilyAndMonth(familyId, year, month))
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [familyId, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('transactions', () => {
    loadData()
  })

  const progress = useMemo(() => {
    return budgets.map((budget) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === budget.category_id &&
            (!budget.member_id || t.owner_id === budget.member_id),
        )
        .reduce((s, t) => s + t.amount, 0)
      const pct = budget.monthly_limit > 0 ? Math.min((spent / budget.monthly_limit) * 100, 100) : 0
      const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'
      return { budget, spent, pct, color }
    })
  }, [budgets, transactions])

  if (budgetsLoading || loading) return <Skeleton className="h-20 rounded-2xl" />
  if (budgets.length === 0) return null

  return (
    <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
      <CardContent className="p-5 space-y-3">
        <h3 className="font-bold text-sm text-gray-900">Orçamentos</h3>
        {progress.map(({ budget, spent, pct, color }) => {
          const cat = budget.expand?.category_id
          const Icon = getCategoryIcon(cat?.icon || 'wallet')
          const accent = primaryColor || cat?.color || '#999'
          return (
            <div key={budget.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: accent + '20' }}
                  >
                    <Icon className="h-3 w-3" style={{ color: accent }} />
                  </div>
                  <span className="font-medium text-gray-700">{cat?.name || 'Sem categoria'}</span>
                </div>
                <span className="text-gray-500">
                  {formatBRL(spent)} / {formatBRL(budget.monthly_limit)}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
