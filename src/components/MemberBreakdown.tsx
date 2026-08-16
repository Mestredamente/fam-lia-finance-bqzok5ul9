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

/** Splits a display name into first name and the remainder (surname). */
function splitName(fullName: string): { first: string; rest: string } {
  const trimmed = (fullName || '').trim()
  if (!trimmed) return { first: '', rest: '' }
  const parts = trimmed.split(/\s+/)
  const first = parts[0]
  const rest = parts.slice(1).join(' ')
  return { first, rest }
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
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro ativo</p>
  }

  const getMemberIncome = (m: MemberRecord, ms?: MemberSummary): number => {
    const allowance = m.monthly_allowance ?? 0
    if (m.is_dependent) return allowance
    return (ms?.totalReceitas ?? 0) + allowance
  }

  const rows = activeMembers.map((m) => {
    const ms = memberSummaries[m.id]
    const income = getMemberIncome(m, ms)
    const expenses = ms?.totalDespesas ?? 0
    const balance = income - expenses
    return { m, income, expenses, balance }
  })

  return (
    <div className="w-full">
      {/* MOBILE: stacked cards (< 640px) */}
      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map(({ m, income, expenses, balance }) => {
          const { first, rest } = splitName(m.display_name)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMemberClick(m)}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-2.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <Avatar className="h-8 w-8 border border-[#22C55E] shrink-0">
                <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                <AvatarFallback className="bg-emerald-100 text-[#166534] text-xs font-bold">
                  {m.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight">{first}</span>
                {rest ? (
                  <span className="block truncate text-xs text-muted-foreground leading-tight">
                    {rest}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 shrink-0">
                <div className="text-right">
                  <span className="block text-[10px] uppercase text-muted-foreground">Rec.</span>
                  <span className="block text-xs font-medium tabular-nums text-green-600 dark:text-green-500">
                    {formatBRL(income)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase text-muted-foreground">Desp.</span>
                  <span className="block text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                    {formatBRL(expenses)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase text-muted-foreground">Saldo</span>
                  <span
                    className={cn(
                      'block text-xs font-bold tabular-nums',
                      balance >= 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {formatBRL(balance)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* DESKTOP: table (>= 640px) */}
      <table className="hidden w-full sm:table" style={{ tableLayout: 'auto' }}>
        <thead>
          <tr className="text-xs font-semibold uppercase border-b text-muted-foreground">
            <th className="text-left px-2 pb-1.5 font-semibold whitespace-nowrap">Membro</th>
            <th className="text-right px-2 pb-1.5 font-semibold whitespace-nowrap">Rec.</th>
            <th className="text-right px-2 pb-1.5 font-semibold whitespace-nowrap">Desp.</th>
            <th className="text-right px-2 pb-1.5 font-semibold whitespace-nowrap">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, income, expenses, balance }) => {
            const { first, rest } = splitName(m.display_name)
            return (
              <tr
                key={m.id}
                onClick={() => onMemberClick(m)}
                className="rounded-lg hover:bg-accent/40 cursor-pointer transition-colors"
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-10 w-10 border border-[#22C55E] shrink-0">
                      <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                      <AvatarFallback className="bg-emerald-100 text-[#166534] text-xs font-bold">
                        {m.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{first}</span>
                      {rest ? (
                        <span className="block text-xs text-muted-foreground leading-tight">
                          {rest}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="text-xs font-medium text-right tabular-nums px-2 py-2 text-green-600 dark:text-green-500">
                  {formatBRL(income)}
                </td>
                <td className="text-xs font-medium text-right tabular-nums px-2 py-2 text-red-600 dark:text-red-400">
                  {formatBRL(expenses)}
                </td>
                <td
                  className={cn(
                    'text-xs font-bold text-right tabular-nums px-2 py-2',
                    balance >= 0
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-red-600 dark:text-red-400',
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
