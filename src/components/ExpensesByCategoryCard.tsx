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
import { formatBRL } from '@/lib/utils'

interface Props {
  familyId: string
  year: number
  month: number
  loading?: boolean
}

export function ExpensesByCategoryCard({ familyId, year, month, loading }: Props) {
  const { expensesByCategory, loading: chartsLoading } = useMonthlyCharts(familyId, year, month)

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
              {pieData.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-gray-600">{c.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{formatBRL(c.value)}</span>
                </div>
              ))}
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
