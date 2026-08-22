import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSavingsGoals } from '@/hooks/use-savings-goals'
import { usePrivacy } from '@/hooks/use-privacy'
import { formatBRL } from '@/lib/utils'
import type { SavingsGoal } from '@/types/finance'

interface Props {
  familyId: string
}

export function SavingsGoalsCard({ familyId }: Props) {
  const navigate = useNavigate()
  const { goals, loading } = useSavingsGoals(familyId)
  const { formatCurrency } = usePrivacy()

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals])

  const summary = useMemo(() => {
    const totalSaved = activeGoals.reduce((s, g) => s + (g.current_amount || 0), 0)
    const totalTarget = activeGoals.reduce((s, g) => s + (g.target_amount || 0), 0)
    return { totalSaved, totalTarget }
  }, [activeGoals])

  const topGoals = useMemo(() => {
    return [...activeGoals]
      .map((g) => ({
        goal: g,
        pct: g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [activeGoals])

  if (loading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-[#166534]" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-foreground">
              Metas de Economia
            </h2>
          </div>
          <div className="h-32 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (activeGoals.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-[#166534]" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-foreground">
              Metas de Economia
            </h2>
          </div>
          <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-2xl">
              🎯
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Crie sua primeira meta de economia
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/metas')}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              Criar meta
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#166534]" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-foreground">
              Metas de Economia
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/metas')}
            className="h-7 text-xs text-gray-500 hover:text-gray-700"
          >
            Ver todas
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(summary.totalSaved)} poupados de {formatCurrency(summary.totalTarget)}{' '}
            totais
          </p>
        </div>

        <div className="space-y-3">
          {topGoals.map(({ goal, pct }) => (
            <GoalMiniRow
              key={goal.id}
              goal={goal}
              pct={pct}
              onClick={() => navigate('/metas')}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GoalMiniRow({
  goal,
  pct,
  onClick,
  formatCurrency,
}: {
  goal: SavingsGoal
  pct: number
  onClick: () => void
  formatCurrency: (v: number) => string
}) {
  const color = goal.color || '#10b981'
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
    >
      <span className="text-lg shrink-0" aria-hidden="true">
        {goal.icon || '🎯'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-900 dark:text-foreground truncate">
            {goal.title}
          </span>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
          </span>
        </div>
      </div>
    </button>
  )
}
