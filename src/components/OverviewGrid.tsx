import { PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { MemberBreakdown } from '@/components/MemberBreakdown'
import { useMonthlyCharts } from '@/hooks/use-monthly-charts'
import { formatBRL } from '@/lib/utils'
import type { MemberRecord } from '@/types/finance'
import type { MemberSummary } from '@/hooks/use-monthly-summary'

interface Props {
  familyId: string
  year: number
  month: number
  members: MemberRecord[]
  memberSummaries: Record<string, MemberSummary>
  loading: boolean
  onMemberClick: (m: MemberRecord) => void
  onInvite: () => void
}

export function OverviewGrid({
  familyId,
  year,
  month,
  members,
  memberSummaries,
  loading,
  onMemberClick,
  onInvite,
}: Props) {
  const { expensesByCategory, loading: chartsLoading } = useMonthlyCharts(familyId, year, month)

  const top5 = expensesByCategory.slice(0, 5)
  const otherTotal = expensesByCategory.slice(5).reduce((s, c) => s + c.value, 0)
  const pieData = [
    ...top5,
    ...(otherTotal > 0 ? [{ name: 'Outros', value: otherTotal, color: '#CBD5E1' }] : []),
  ]
  const pieConfig: ChartConfig = { value: { label: 'Valor' } }

  if (chartsLoading && loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
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
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
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

        <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm text-gray-900 mb-3">Visão por membro</h3>
            <MemberBreakdown
              members={members}
              memberSummaries={memberSummaries}
              loading={loading}
              onMemberClick={onMemberClick}
            />
          </CardContent>
        </Card>
      </div>

      {members.filter((m) => m.is_active).length <= 1 && (
        <div className="p-4 bg-[#F0FDF4] border border-[#22C55E] rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-[#166534] shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Convide seu cônjuge</h3>
              <p className="text-xs text-gray-600">Compartilhe as finanças familiares!</p>
            </div>
          </div>
          <Button
            onClick={onInvite}
            className="bg-[#166534] hover:bg-[#15803D] text-white text-xs font-semibold shrink-0"
          >
            Gerar convite
          </Button>
        </div>
      )}
    </div>
  )
}
