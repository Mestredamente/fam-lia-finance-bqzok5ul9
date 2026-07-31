import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberRecord } from '@/types/finance'
import { formatBRL, cn } from '@/lib/utils'
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
  const activeMembers = members.filter((m) => m.is_active)

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  if (activeMembers.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Nenhum membro ativo</p>
  }

  const getMemberIncome = (m: MemberRecord, ms?: MemberSummary): number => {
    const allowance = m.monthly_allowance ?? 0
    if (m.is_dependent) return allowance
    return (ms?.totalReceitas ?? 0) + allowance
  }

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-2 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase border-b border-gray-100">
        <span>Membro</span>
        <span className="text-right">Rec.</span>
        <span className="text-right">Desp.</span>
        <span className="text-right">Saldo</span>
      </div>
      {activeMembers.map((m) => {
        const ms = memberSummaries[m.id]
        const income = getMemberIncome(m, ms)
        const expenses = ms?.totalDespesas ?? 0
        const balance = income - expenses
        return (
          <div
            key={m.id}
            onClick={() => onMemberClick(m)}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 border border-[#22C55E] shrink-0">
                <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                <AvatarFallback className="bg-emerald-100 text-[#166534] text-[10px] font-bold">
                  {m.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-gray-900 truncate">{m.display_name}</span>
            </div>
            <span className="text-xs font-medium text-[#166534] text-right tabular-nums">
              {formatBRL(income)}
            </span>
            <span className="text-xs font-medium text-red-600 text-right tabular-nums">
              {formatBRL(expenses)}
            </span>
            <span
              className={cn(
                'text-xs font-bold text-right tabular-nums',
                balance >= 0 ? 'text-blue-700' : 'text-red-600',
              )}
            >
              {formatBRL(balance)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
