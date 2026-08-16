import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBudgets } from '@/hooks/use-budgets'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import { getCategoryIcon } from '@/lib/category-icons'
import { computeBudgetProgress, budgetBarColor } from '@/lib/budget-utils'
import { formatBRL } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface Props {
  familyId: string
  year: number
  month: number
}

const MAX_VISIBLE = 5

export function BudgetAlertBanner({ familyId, year, month }: Props) {
  const navigate = useNavigate()
  const { budgets } = useBudgets(familyId)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    getTransactionsByFamilyAndMonth(familyId, year, month)
      .then(setTransactions)
      .catch(() => {})
  }, [familyId, year, month])

  const inAlert = useMemo(() => {
    const progress = computeBudgetProgress(budgets, transactions)
    return progress.filter((p) => p.pct >= 80).sort((a, b) => b.pct - a.pct)
  }, [budgets, transactions])

  if (dismissed || inAlert.length === 0) return null

  const visible = inAlert.slice(0, MAX_VISIBLE)
  const extra = inAlert.length - visible.length

  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 rounded-2xl shadow-subtle">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              Orçamentos em alerta
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            onClick={() => setDismissed(true)}
            aria-label="Dispensar alerta"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2.5">
          {visible.map(({ budget, spent, pct }) => {
            const cat = budget.expand?.category_id
            const Icon = getCategoryIcon(cat?.icon || 'wallet')
            const widthPct = Math.min(pct, 100)
            return (
              <div key={budget.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cat?.color || '#999' }} />
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate flex-1">
                    {cat?.name || 'Sem categoria'}
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 whitespace-nowrap">
                    {formatBRL(spent)} / {formatBRL(budget.monthly_limit)} · {Math.round(pct)}%
                  </span>
                </div>
                <div className="w-full bg-amber-100 dark:bg-amber-900/40 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${budgetBarColor(pct)}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {extra > 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            e mais {extra} {extra === 1 ? 'categoria' : 'categorias'}
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          onClick={() => navigate('/orcamentos')}
        >
          Ver orçamentos
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </Card>
  )
}
