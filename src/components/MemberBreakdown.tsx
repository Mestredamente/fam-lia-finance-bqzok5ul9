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
    <div className="w-full">
      <table className="w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr className="text-xs font-semibold text-gray-400 uppercase border-b border-gray-100">
            <th className="text-left px-2 pb-1.5 font-semibold">Membro</th>
            <th className="text-right px-2 pb-1.5 font-semibold">Rec.</th>
            <th className="text-right px-2 pb-1.5 font-semibold">Desp.</th>
            <th className="text-right px-2 pb-1.5 font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {activeMembers.map((m) => {
            const ms = memberSummaries[m.id]
            const income = getMemberIncome(m, ms)
            const expenses = ms?.totalDespesas ?? 0
            const balance = income - expenses
            return (
              <tr
                key={m.id}
                onClick={() => onMemberClick(m)}
                className="rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7 border border-[#22C55E] shrink-0">
                      <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                      <AvatarFallback className="bg-emerald-100 text-[#166534] text-[10px] font-bold">
                        {m.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {m.display_name}
                    </span>
                  </div>
                </td>
                <td className="text-xs font-medium text-[#166534] text-right tabular-nums px-2 py-2">
                  {formatBRL(income)}
                </td>
                <td className="text-xs font-medium text-red-600 text-right tabular-nums px-2 py-2">
                  {formatBRL(expenses)}
                </td>
                <td
                  className={cn(
                    'text-xs font-bold text-right tabular-nums px-2 py-2',
                    balance >= 0 ? 'text-blue-700' : 'text-red-600',
                  )}
                >
                  {formatBRL(balance)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
