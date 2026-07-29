import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberRecord, getRoleLabel } from '@/types/finance'
import { formatBRL, getProgressBarColor } from '@/lib/utils'
import type { MemberSummary } from '@/hooks/use-monthly-summary'

interface MemberBreakdownProps {
  members: MemberRecord[]
  memberSummaries: Record<string, MemberSummary>
  loading: boolean
  onMemberClick: (member: MemberRecord) => void
}

export function MemberBreakdown({
  members,
  memberSummaries,
  loading,
  onMemberClick,
}: MemberBreakdownProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Visão por membro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Visão por membro</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {members.map((m) => {
          const ms = memberSummaries[m.id]
          const income = ms?.totalReceitas ?? 0
          const expenses = ms?.totalDespesas ?? 0
          const ratio = income > 0 ? Math.min((expenses / income) * 100, 100) : 0
          const barColor = income > 0 ? getProgressBarColor(ratio) : 'bg-gray-300'
          return (
            <Card
              key={m.id}
              onClick={() => onMemberClick(m)}
              className="border border-gray-100 shadow-subtle hover:shadow-elevation rounded-2xl bg-white cursor-pointer transition-all duration-200"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-[#22C55E]">
                      <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                        {m.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{m.display_name}</h3>
                      <span className="text-xs text-gray-500">{getRoleLabel(m.role)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Ver detalhes
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 flex justify-between font-medium">
                  <span>Receitas: {formatBRL(income)}</span>
                  <span>Despesas: {formatBRL(expenses)}</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
