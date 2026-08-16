import { useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMonthlyCharts } from '@/hooks/use-monthly-charts'
import { getMonthName, formatBRL, cn } from '@/lib/utils'
import { getVariation, getVariationColor, formatVariation } from '@/lib/comparison-utils'

interface Props {
  familyId: string
  year: number
  month: number
}

interface CategoryVar {
  name: string
  current: number
  previous: number
  variation: ReturnType<typeof getVariation>
}

const MAX_BAR_HEIGHT = 120 // px

export function MonthlyComparisonCard({ familyId, year, month }: Props) {
  const { monthlyComparison, monthlyBreakdown, loading } = useMonthlyCharts(familyId, year, month)

  const data = useMemo(() => {
    const current = monthlyComparison[monthlyComparison.length - 1]
    const prev = monthlyComparison[monthlyComparison.length - 2]
    const currentBd = monthlyBreakdown[monthlyBreakdown.length - 1]
    const prevBd = monthlyBreakdown[monthlyBreakdown.length - 2]
    if (!current || !prev || !currentBd || !prevBd) return null

    const hasComparison = prev.income !== 0 || prev.expenses !== 0
    const prevDate = new Date(year, month - 1, 1)
    const prevLabel = getMonthName(prevDate.getMonth()).toLowerCase()

    // Ticket médio = despesas / nº de transações de despesa.
    const currentTicket = currentBd.expenseCount > 0 ? current.expenses / currentBd.expenseCount : 0
    const prevTicket = prevBd.expenseCount > 0 ? prev.expenses / prevBd.expenseCount : 0

    // Comparações por categoria (apenas categorias presentes em algum mês).
    const allCats = new Set([
      ...Object.keys(currentBd.categories),
      ...Object.keys(prevBd.categories),
    ])
    const categoryVars: CategoryVar[] = []
    for (const name of allCats) {
      const c = currentBd.categories[name] || 0
      const p = prevBd.categories[name] || 0
      // Ignora categorias que sumiram totalmente no mês atual (ruído).
      if (c === 0) continue
      categoryVars.push({
        name,
        current: c,
        previous: p,
        variation: getVariation(c, p),
      })
    }

    // Top aumentos: direction 'up' e não novo, ordenado por % desc.
    const increases = categoryVars
      .filter((c) => c.variation.direction === 'up' && !c.variation.isNew)
      .sort((a, b) => b.variation.percent - a.variation.percent)
      .slice(0, 3)
    // Novas categorias também contam como "aumentos" (destaque especial).
    const newCategories = categoryVars.filter((c) => c.variation.isNew).slice(0, 3)
    // Top reduções.
    const reductions = categoryVars
      .filter((c) => c.variation.direction === 'down')
      .sort((a, b) => b.variation.percent - a.variation.percent)
      .slice(0, 3)

    return {
      current,
      prev,
      prevLabel,
      hasComparison,
      currentTicket,
      prevTicket,
      increases,
      newCategories,
      reductions,
    }
  }, [monthlyComparison, monthlyBreakdown, year, month])

  if (loading) return <Skeleton className="h-80 rounded-2xl" />

  if (!data || !data.hasComparison) {
    return (
      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-5">
          <h3 className="font-bold text-sm text-gray-900 mb-3">Comparação Mensal</h3>
          <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
            <TrendingUp className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400 max-w-[220px]">
              Registre transações no mês anterior para ver comparações.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const {
    current,
    prev,
    prevLabel,
    currentTicket,
    prevTicket,
    increases,
    newCategories,
    reductions,
  } = data

  // Alturas proporcionais para o mini gráfico de barras (Receitas + Despesas).
  const maxValue = Math.max(current.income, current.expenses, prev.income, prev.expenses, 1)
  const barH = (v: number) => Math.max((v / maxValue) * MAX_BAR_HEIGHT, 2)

  const renderMetric = (
    label: string,
    value: number,
    previous: number,
    context: 'income' | 'expense' | 'balance',
    suffix = '',
  ) => {
    const variation = getVariation(value, previous)
    const color = getVariationColor(variation.direction, context)
    const diff = value - previous
    const diffText =
      variation.direction === 'stable'
        ? 'sem variação'
        : `${diff >= 0 ? '+' : '-'}${formatBRL(Math.abs(diff))}${suffix}`
    return (
      <div className="space-y-0.5">
        <span className="text-[11px] font-medium text-gray-500 block">{label}</span>
        <span className="text-base font-extrabold text-gray-900 dark:text-foreground block">
          {formatBRL(value)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[11px] font-semibold', color)}>
            {formatVariation(variation)}
          </span>
          <span className="text-[10px] text-gray-400">{diffText}</span>
        </div>
      </div>
    )
  }

  const renderCategoryRow = (c: CategoryVar, isNew = false) => (
    <div key={c.name} className="flex items-center justify-between text-xs gap-2">
      <span className="text-gray-600 dark:text-gray-300 truncate">{c.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-medium text-gray-900 dark:text-foreground">
          {formatBRL(c.current)}
        </span>
        <span
          className={cn(
            'text-[10px] font-semibold whitespace-nowrap',
            isNew
              ? 'text-blue-500 dark:text-blue-400'
              : getVariationColor(c.variation.direction, 'expense'),
          )}
        >
          {formatVariation(c.variation)}
        </span>
      </div>
    </div>
  )

  return (
    <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900">Comparação Mensal</h3>
          <span className="text-[11px] text-gray-400">vs {prevLabel}</span>
        </div>

        {/* Mini gráfico de barras: mês atual vs anterior */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-gray-500">Receitas</span>
            <div className="flex items-end justify-center gap-2" style={{ height: MAX_BAR_HEIGHT }}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-6 rounded-t bg-[#166534]"
                  style={{ height: barH(current.income) }}
                  title={`Atual: ${formatBRL(current.income)}`}
                />
                <span className="text-[9px] text-gray-500">Atual</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-6 rounded-t bg-[#86EFAC] dark:bg-green-900"
                  style={{ height: barH(prev.income) }}
                  title={`Anterior: ${formatBRL(prev.income)}`}
                />
                <span className="text-[9px] text-gray-400">Anterior</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-gray-500">Despesas</span>
            <div className="flex items-end justify-center gap-2" style={{ height: MAX_BAR_HEIGHT }}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-6 rounded-t bg-red-500"
                  style={{ height: barH(current.expenses) }}
                  title={`Atual: ${formatBRL(current.expenses)}`}
                />
                <span className="text-[9px] text-gray-500">Atual</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-6 rounded-t bg-red-200 dark:bg-red-900"
                  style={{ height: barH(prev.expenses) }}
                  title={`Anterior: ${formatBRL(prev.expenses)}`}
                />
                <span className="text-[9px] text-gray-400">Anterior</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 métricas principais */}
        <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
          {renderMetric('Despesas', current.expenses, prev.expenses, 'expense')}
          {renderMetric('Receitas', current.income, prev.income, 'income')}
          {renderMetric('Ticket médio', currentTicket, prevTicket, 'expense', ' por transação')}
        </div>

        {/* Top aumentos e reduções */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                Categorias que mais cresceram
              </span>
            </div>
            {increases.length === 0 && newCategories.length === 0 ? (
              <p className="text-[11px] text-gray-400">Nenhum aumento relevante.</p>
            ) : (
              <div className="space-y-1">
                {newCategories.map((c) => renderCategoryRow(c, true))}
                {increases.map((c) => renderCategoryRow(c))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-green-600" />
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                Categorias que mais diminuíram
              </span>
            </div>
            {reductions.length === 0 ? (
              <p className="text-[11px] text-gray-400">Nenhuma redução relevante.</p>
            ) : (
              <div className="space-y-1">{reductions.map((c) => renderCategoryRow(c))}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
