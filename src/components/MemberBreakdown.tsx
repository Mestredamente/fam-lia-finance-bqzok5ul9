import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberRecord } from '@/types/finance'
import { cn } from '@/lib/utils'
import { usePrivacy } from '@/hooks/use-privacy'
import { getMemberAvatarUrl } from '@/lib/member-utils'
import type { MemberSummary } from '@/hooks/use-monthly-summary'
import { Users } from 'lucide-react'

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
  const { formatCurrency } = usePrivacy()

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

  const totalIncome = rows.reduce((s, r) => s + r.income, 0)
  const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0)
  const totalBalance = totalIncome - totalExpenses

  return (
    <div className="w-full">
      {/* TOTAL FAMÍLIA — linha de total consolidado no topo do card.
          Fundo levemente destacado (bg-primary/5), fonte bold. Visível em
          mobile e desktop. */}
      <div className="mb-3 rounded-lg bg-primary/5 border border-primary/10 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5 sm:hidden">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            Total Família
          </span>
        </div>
        {/* Mobile: grid 3 colunas */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div className="min-w-0">
            <span className="block whitespace-nowrap text-[10px] uppercase text-muted-foreground">
              Rec.
            </span>
            <span className="block truncate text-xs font-bold tabular-nums text-green-600 dark:text-green-500">
              {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block whitespace-nowrap text-[10px] uppercase text-muted-foreground">
              Desp.
            </span>
            <span className="block truncate text-xs font-bold tabular-nums text-red-600 dark:text-red-400">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block whitespace-nowrap text-[10px] uppercase text-muted-foreground">
              Saldo
            </span>
            <span
              className={cn(
                'block truncate text-xs font-bold tabular-nums',
                totalBalance >= 0
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>
        {/* Desktop: mesma grade das linhas de membros — alinhamento consistente
            das colunas [nome | receitas | despesas | saldo]. */}
        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(80px,1fr))] sm:gap-x-3 sm:items-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide text-primary truncate">
              Total Família
            </span>
          </div>
          <span className="text-right text-sm font-bold tabular-nums text-green-600 dark:text-green-500">
            {formatCurrency(totalIncome)}
          </span>
          <span className="text-right text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
            {formatCurrency(totalExpenses)}
          </span>
          <span
            className={cn(
              'text-right text-sm font-bold tabular-nums',
              totalBalance >= 0
                ? 'text-green-600 dark:text-green-500'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {formatCurrency(totalBalance)}
          </span>
        </div>
      </div>

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
                      {formatCurrency(income)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      Desp.
                    </span>
                    <span className="block truncate text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
                      {formatCurrency(expenses)}
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
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </div>{' '}
              </div>
            </button>
          )
        })}
      </div>

      {/* DESKTOP: grade unificada (>= 640px). O cabeçalho, as linhas de membros
          e a linha TOTAL usam o MESMO grid-template, garantindo alinhamento
          perfeito das colunas [nome | receitas | despesas | saldo]. Valores à
          direita, nomes à esquerda. */}
      <div className="hidden sm:block">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(80px,1fr))] gap-x-3 border-b pb-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <div className="text-left px-1">Membro</div>
          <div className="text-right px-1">Receitas</div>
          <div className="text-right px-1">Despesas</div>
          <div className="text-right px-1">Saldo</div>
        </div>
        {/* Linhas de membros */}
        {rows.map(({ m, income, expenses, balance }) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMemberClick(m)}
            className="grid w-full grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(80px,1fr))] gap-x-3 items-center rounded-lg px-1 py-2 text-left hover:bg-accent/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-10 w-10 border border-[#22C55E] shrink-0">
                <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                <AvatarFallback className="bg-emerald-100 text-[#166534] text-xs font-bold">
                  {m.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="block truncate text-sm font-medium leading-tight">
                {m.display_name}
              </span>
            </div>
            <span className="text-right text-xs font-medium tabular-nums text-green-600 dark:text-green-500">
              {formatCurrency(income)}
            </span>
            <span className="text-right text-xs font-medium tabular-nums text-red-600 dark:text-red-400">
              {formatCurrency(expenses)}
            </span>
            <span
              className={cn(
                'text-right text-xs font-bold tabular-nums',
                balance >= 0
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {formatCurrency(balance)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
