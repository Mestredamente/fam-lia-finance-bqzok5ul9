import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/hooks/use-theme'
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
}

export function MonthlyChartsSection({ familyId, year, month }: Props) {
  const { expensesByCategory, monthlyComparison, loading } = useMonthlyCharts(familyId, year, month)
  const isDark = useTheme().resolvedTheme === 'dark'
  const axisColor = isDark ? '#e5e7eb' : '#374151'
  const gridColor = isDark ? '#374151' : '#e5e7eb'

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const pieConfig: ChartConfig = { value: { label: 'Valor' } }
  const barConfig: ChartConfig = {
    income: { label: 'Receitas', color: 'hsl(142, 71%, 45%)' },
    expenses: { label: 'Despesas', color: 'hsl(0, 84%, 60%)' },
  }
  const hasPieData = expensesByCategory.length > 0
  const hasBarData = monthlyComparison.some((m) => m.income > 0 || m.expenses > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border border-gray-100 dark:border-gray-700 shadow-subtle rounded-2xl bg-white dark:bg-card">
        <CardContent className="p-3 sm:p-5">
          <h3 className="font-bold text-sm text-gray-900 dark:text-foreground mb-4">
            Despesas por Categoria
          </h3>
          {hasPieData ? (
            <ChartContainer config={pieConfig} className="h-48 w-full">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                >
                  {expensesByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Sem despesas neste mês
            </div>
          )}
          {hasPieData && (
            <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
              {expensesByCategory.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-gray-600 dark:text-gray-300 truncate">{cat.name}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-foreground shrink-0">
                    {formatBRL(cat.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full max-w-full overflow-hidden border border-gray-100 dark:border-gray-700 shadow-subtle rounded-2xl bg-white dark:bg-card">
        <CardContent className="p-3 sm:p-5">
          <h3 className="font-bold text-sm text-gray-900 dark:text-foreground mb-4">
            Receitas x Despesas (12 meses)
          </h3>
          {hasBarData ? (
            <ChartContainer config={barConfig} className="h-64 w-full">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: axisColor }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisColor }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              Sem dados suficientes
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
