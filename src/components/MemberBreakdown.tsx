import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'
import { MemberRecord, getRoleLabel } from '@/types/finance'
import { formatBRL, getProgressBarColor } from '@/lib/utils'
import { getMemberAvatarUrl } from '@/lib/member-utils'
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

  const getMemberIncome = (m: MemberRecord, ms?: MemberSummary): number => {
    const allowance = m.monthly_allowance ?? 0
    if (m.is_dependent) return allowance
    return (ms?.totalReceitas ?? 0) + allowance
  }

  const dependentMembers = members.filter((m) => m.is_dependent)
  const dependentCost = dependentMembers.reduce((sum, m) => {
    const ms = memberSummaries[m.id]
    return sum + (ms?.totalDespesas ?? 0)
  }, 0)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Visão por membro</h2>

      {dependentMembers.length > 0 && (
        <Card className="border border-orange-100 bg-orange-50 shadow-subtle rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Custo total de dependentes</span>
              <span className="text-lg font-bold text-orange-700">{formatBRL(dependentCost)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {members.map((m) => {
          const ms = memberSummaries[m.id]
          const income = getMemberIncome(m, ms)
          const expenses = ms?.totalDespesas ?? 0
          const balance = income - expenses
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
                      <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                      <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                        {m.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-gray-900">{m.display_name}</h3>
                        {m.is_dependent && (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[9px] px-1.5 py-0">
                            Dependente
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{getRoleLabel(m.role)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Ver detalhes
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 flex justify-between font-medium">
                  <span>
                    {m.is_dependent && (m.monthly_allowance ?? 0) === 0
                      ? 'Receitas: —'
                      : `Receitas: ${formatBRL(income)}`}
                  </span>
                  <span>Despesas: {formatBRL(expenses)}</span>
                </div>
                {income > 0 && (
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                )}
                {income > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">
                      Saldo:{' '}
                      <span
                        className={
                          balance >= 0 ? 'text-[#166534] font-bold' : 'text-red-600 font-bold'
                        }
                      >
                        {formatBRL(balance)}
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
