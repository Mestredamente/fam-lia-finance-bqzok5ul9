import { PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useMonthlyCharts } from '@/hooks/use-monthly-charts'
import { formatBRL, cn } from '@/lib/utils'
import { getVariation, getVariationColor, formatVariation } from '@/lib/comparison-utils'

interface Props {
  familyId: string
  year: number
  month: number
  loading?: boolean
}

export function ExpensesByCategoryCard({ familyId, year, month, loading }: Props) {
  const {
    expensesByCategory,
    monthlyBreakdown,
    loading: chartsLoading,
  } = useMonthlyCharts(familyId, year, month)

  // Penúltimo elemento = mês anterior; último = mês atual.
  const prevBreakdown = monthlyBreakdown[monthlyBreakdown.length - 2]
  const hasPrev = !!prevBreakdown && Object.keys(prevBreakdown.categories).length > 0

  const top5 = expensesByCategory.slice(0, 5)
  const otherTotal = expensesByCategory.slice(5).reduce((s, c) => s + c.value, 0)
  const pieData = [
    ...top5,
    ...(otherTotal > 0 ? [{ name: 'Outros', value: otherTotal, color: '#CBD5E1' }] : []),
  ]
  const pieConfig: ChartConfig = { value: { label: 'Valor' } }

  if (chartsLoading && loading) {
    return <Skeleton className="h-64 rounded-2xl" />
  }

  return (
    <Card className="w-full max-w-full border border-gray-100 shadow-subtle rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-5">
        <h3 className="font-bold text-sm text-gray-900 mb-3">Despesas por Categoria</h3>
        {pieData.length > 0 ? (
          <>
            <ChartContainer config={pieConfig} className="h-40 w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={35}
                >
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-2 space-y-1">
              {pieData.map((c, i) => {
                // "Outros" agrega várias categorias — não mostramos variação.
                const prevValue =
                  hasPrev && c.name !== 'Outros' ? prevBreakdown.categories[c.name] || 0 : undefined
                const showVariation = hasPrev && prevValue !== undefined
                const variation = showVariation ? getVariation(c.value, prevValue as number) : null
                return (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-gray-600 truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {showVariation && variation && (
                        <span
                          title={
                            variation.isNew
                              ? 'Categoria nova neste mês'
                              : `Mês anterior: ${formatBRL(prevValue)}`
                          }
                          className={cn(
                            'text-[10px] font-semibold whitespace-nowrap',
                            variation.isNew
                              ? 'text-blue-500 dark:text-blue-400'
                              : getVariationColor(variation.direction, 'expense'),
                          )}
                        >
                          {formatVariation(variation)}
                        </span>
                      )}
                      <span className="font-medium text-gray-900">{formatBRL(c.value)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">
            Sem despesas neste mês
          </div>
        )}
      </CardContent>
    </Card>
  )
}
