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

/**
 * Returns a short display name for narrow mobile layouts:
 * first name + last name. Never the full name.
 *   "Sylvio Takayoshi Barbosa Tutya" -> "Sylvio Tutya"
 *   "Lidia Carolina Rodrigues Balabuch" -> "Lidia Balabuch"
 */
function getDisplayName(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]
  const firstName = parts[0]
  const lastName = parts[parts.length - 1]
  return `${firstName} ${lastName}`
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
          const shortName = getDisplayName(m.display_name)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMemberClick(m)}
              className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-card p-2.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <Avatar className="h-8 w-8 border border-[#22C55E] shrink-0">
                <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                <AvatarFallback className="bg-emerald-100 text-[#166534] text-xs font-bold">
                  {m.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight">
                  {shortName}
                </span>

                <div className="mt-1 grid grid-cols-3 gap-2">
                  <div className="min-w-0">
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      Rec.
                    </span>
                    <span className="block truncate text-xs font-medium tabular-nums text-green-600 dark:text-green-500">
                      {formatBRL(income)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      Desp.
                    </span>
                    <span className="block truncate text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                      {formatBRL(expenses)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      Saldo
                    </span>
                    <span
                      className={cn(
                        'block truncate text-xs font-bold tabular-nums',
                        balance >= 0
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {formatBRL(balance)}
                    </span>
                  </div>
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
            <th className="text-right px-2 pb-1.5 font-semibold whitespace-nowrap">Receitas</th>
            <th className="text-right px-2 pb-1.5 font-semibold whitespace-nowrap">Despesas</th>
            <th className="text-right px-2 pb-1.5 font-semibold whitespace-nowrap">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, income, expenses, balance }) => {
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
                      <span className="block whitespace-normal text-sm font-medium leading-tight">
                        {m.display_name}
                      </span>
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
