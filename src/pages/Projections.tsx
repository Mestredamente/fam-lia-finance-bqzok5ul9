import { useMemo, useEffect, useState } from 'react'
import {
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  AlertCircle,
  Repeat,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { useFutureInstallments } from '@/hooks/use-future-installments'
import { useDebts } from '@/hooks/use-debts'
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions'
import { useInvestments } from '@/hooks/use-investments'
import { getActiveMembersByFamilyId } from '@/services/members'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn, formatBRL, getMonthName } from '@/lib/utils'
import { getDebtMeta } from '@/lib/patrimony-icons'

const SHORT_MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

function monthKey(dateStr: string) {
  return dateStr.substring(0, 7) // YYYY-MM
}

function shortLabel(key: string) {
  const [y, m] = key.split('-')
  return `${SHORT_MONTHS[parseInt(m, 10) - 1]}/${y.slice(2)}`
}

export default function Projections() {
  const { family } = useAuth()
  const { installments, loading: installmentsLoading } = useFutureInstallments(family?.id)
  const { debts, loading: debtsLoading } = useDebts(family?.id)
  const { investments, loading: investmentsLoading } = useInvestments(family?.id)
  const { recurring, loading: recurringLoading } = useRecurringTransactions(family?.id)
  const [filter, setFilter] = useState<'all' | 'card' | 'debt' | 'investment'>('all')
  const [monthlyIncome, setMonthlyIncome] = useState(0)

  const isDark = useTheme().resolvedTheme === 'dark'
  const axisColor = isDark ? '#e5e7eb' : '#374151'
  const gridColor = isDark ? '#374151' : '#e5e7eb'

  useEffect(() => {
    if (!family) return
    getActiveMembersByFamilyId(family.id)
      .then((members) => setMonthlyIncome(members.reduce((s, m) => s + (m.monthly_income || 0), 0)))
      .catch(() => setMonthlyIncome(0))
  }, [family?.id])

  // Investimentos parcelados ativos com parcelas restantes — projetar como
  // despesas futuras nos meses seguintes, integrando à timeline de parcelas.
  const activeInvestments = investments.filter(
    (inv) =>
      inv.is_active &&
      inv.installments_total &&
      inv.installments_total > 0 &&
      (inv.installments_paid || 0) < inv.installments_total,
  )

  // Sintetiza "transações" futuras para cada parcela restante de investimento,
  // no dia de vencimento de cada mês a partir do próximo mês.
  const investmentFutureInstallments = useMemo(() => {
    const out: {
      transaction_date: string
      amount: number
      description: string
      investment_id: string
      source: 'investment'
    }[] = []
    const now = new Date()
    for (const inv of activeInvestments) {
      const paid = inv.installments_paid || 0
      const total = inv.installments_total || 0
      const remaining = Math.max(0, total - paid)
      if (remaining <= 0) continue
      const value = inv.installment_value || 0
      const dueDay = Math.min(
        inv.installment_due_day && inv.installment_due_day > 0 ? inv.installment_due_day : 1,
        28,
      )
      // Primeira parcela restante: próximo vencimento a partir de hoje.
      let month = now.getMonth()
      let year = now.getFullYear()
      // Se o dia de vencimento deste mês já passou, começa no mês seguinte.
      if (dueDay <= now.getDate()) {
        month += 1
        if (month > 11) {
          month = 0
          year += 1
        }
      }
      for (let i = 0; i < remaining; i++) {
        const d = new Date(year, month, dueDay)
        const iso = d.toISOString().split('T')[0]
        const parcelaNum = paid + i + 1
        out.push({
          transaction_date: iso,
          amount: value,
          description: `Parcela ${parcelaNum}/${total}: ${inv.name}`,
          investment_id: inv.id,
          source: 'investment',
        })
        month += 1
        if (month > 11) {
          month = 0
          year += 1
        }
      }
    }
    return out
  }, [activeInvestments])

  // Combina parcelas futuras de cartão/dívida (transactions) com parcelas
  // futuras sintetizadas de investimentos parcelados ativos.
  const combinedInstallments = useMemo(() => {
    const base: {
      transaction_date: string
      amount: number
      description: string
      investment_id?: string
      debt_id?: string | null
      source: string
    }[] = installments.map((t) => ({
      transaction_date: t.transaction_date,
      amount: t.amount,
      description: t.description,
      debt_id: t.debt_id,
      source: t.source || '',
    }))
    return base.concat(investmentFutureInstallments)
  }, [installments, investmentFutureInstallments])

  const filteredInstallments = useMemo(() => {
    if (filter === 'all') return combinedInstallments
    if (filter === 'investment')
      return combinedInstallments.filter((t) => t.source === 'investment')
    return combinedInstallments.filter((t) => {
      // Heurística de tipo da parcela futura:
      // transações vinculadas a dívida (debt_id ou source debt/recurring_debt) -> Dívida;
      // investimentos parcelados (source investment) -> Investimento;
      // demais -> Cartão. Após a unificação de tipos, transações são só expense/income,
      // então a distinção passa a ser por debt_id / source.
      if (filter === 'debt')
        return !!t.debt_id || t.source === 'debt_payment' || t.source === 'recurring_debt'
      if (filter === 'card')
        return (
          !t.debt_id &&
          t.source !== 'debt_payment' &&
          t.source !== 'recurring_debt' &&
          t.source !== 'investment'
        )
      return true
    })
  }, [combinedInstallments, filter])

  // Classifica cada parcela por categoria (para badges na aba "Todos")
  type ItemKind = 'investment' | 'debt' | 'card'
  function classifyItem(t: (typeof combinedInstallments)[number]): ItemKind {
    if (t.source === 'investment') return 'investment'
    if (!!t.debt_id || t.source === 'debt_payment' || t.source === 'recurring_debt') return 'debt'
    return 'card'
  }

  // Indica se a aba "Investimentos" está ativa (muda o card de total consolidado).
  const isInvestmentTab = filter === 'investment'

  const monthlyMap = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    for (const tx of filteredInstallments) {
      const key = monthKey(tx.transaction_date)
      if (!map[key]) map[key] = { total: 0, count: 0 }
      map[key].total += tx.amount
      map[key].count += 1
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredInstallments])

  const totalFuture = filteredInstallments.reduce((s, t) => s + t.amount, 0)
  const totalInstallments = filteredInstallments.length
  const maxValue = monthlyMap.reduce((m, [, d]) => Math.max(m, d.total), 0)

  const chartData = monthlyMap.map(([key, data]) => ({
    key,
    label: shortLabel(key),
    value: data.total,
    count: data.count,
  }))

  const peakMonth = monthlyMap.reduce(
    (acc, [key, data]) => (data.total > acc.value ? { key, value: data.total } : acc),
    { key: '', value: 0 },
  )

  const lastMonth = monthlyMap.length > 0 ? monthlyMap[monthlyMap.length - 1][0] : null

  const activeDebts = debts
    .filter((d) => d.is_active)
    .slice()
    .sort(
      (a, b) =>
        b.installment_value * (b.installments_total - b.installments_paid) -
        a.installment_value * (a.installments_total - a.installments_paid),
    )
  const totalDebtRemaining = activeDebts.reduce(
    (s, d) => s + d.installment_value * (d.installments_total - d.installments_paid),
    0,
  )

  // Recorrentes ativas: soma mensal comprometida (somente despesas, para projeção).
  const activeRecurringExpenses = recurring.filter((r) => r.active && r.type === 'despesa')
  const recurringMonthly = activeRecurringExpenses.reduce((s, r) => s + r.amount, 0)
  const activeRecurringIncome = recurring.filter((r) => r.active && r.type === 'receita')
  const recurringMonthlyIncome = activeRecurringIncome.reduce((s, r) => s + r.amount, 0)

  const loading = installmentsLoading || debtsLoading || recurringLoading || investmentsLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
            Projeções Financeiras
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Comprometimento futuro em parcelas, dívidas em pagamento e timeline mensal.
          </p>
        </div>
      </div>

      {/* Filtro de categoria — sempre visível no topo */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="card">Cartão</TabsTrigger>
          <TabsTrigger value="debt">Dívida</TabsTrigger>
          <TabsTrigger value="investment">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="ml-1">Investimentos</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SEÇÃO 1 — Comprometimento futuro em parcelas */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-foreground">
          Comprometimento futuro em parcelas
        </h2>
        {loading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : filteredInstallments.length === 0 ? (
          <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <Calendar className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma parcela futura cadastrada.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    isInvestmentTab
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700',
                  )}
                >
                  {isInvestmentTab ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <TrendingDown className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    {isInvestmentTab ? 'Total em investimentos' : 'Total consolidado'}
                  </span>
                  <span
                    className={cn(
                      'text-2xl font-extrabold',
                      isInvestmentTab ? 'text-emerald-700' : 'text-amber-700',
                    )}
                  >
                    {formatBRL(totalFuture)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({totalInstallments}{' '}
                    {totalInstallments === 1 ? 'parcela restante' : 'parcelas restantes'})
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
              <CardContent className="p-5 space-y-3">
                {monthlyMap.map(([key, data]) => {
                  const widthPct = maxValue > 0 ? (data.total / maxValue) * 100 : 0
                  // Na aba "Todos", calcula a composição de tipos do mês para exibir badges.
                  const monthItems = filteredInstallments.filter(
                    (t) => monthKey(t.transaction_date) === key,
                  )
                  const kinds = new Set(monthItems.map(classifyItem))
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {getMonthName(parseInt(key.split('-')[1], 10) - 1)} {key.split('-')[0]}
                          </span>
                          {filter === 'all' && kinds.has('investment') && (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              Investimento
                            </Badge>
                          )}
                          {filter === 'all' && kinds.has('debt') && (
                            <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">
                              Dívida
                            </Badge>
                          )}
                          {filter === 'all' && kinds.has('card') && (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Cartão
                            </Badge>
                          )}
                        </span>
                        <span className="text-gray-600">
                          {formatBRL(data.total)} ({data.count}{' '}
                          {data.count === 1 ? 'parcela' : 'parcelas'})
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-500',
                            isInvestmentTab ? 'bg-emerald-500' : 'bg-amber-500',
                          )}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* SEÇÃO 2 — Dívidas em pagamento */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-foreground">
          Dívidas em pagamento
        </h2>
        {loading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : activeDebts.length === 0 ? (
          <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <Wallet className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma dívida ativa.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border border-red-200 bg-danger/5 rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Total restante (dívidas ativas)
                  </span>
                  <span className="text-2xl font-extrabold text-red-700">
                    {formatBRL(totalDebtRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {activeDebts.map((debt) => {
                const meta = getDebtMeta(debt.type)
                const Icon = meta.icon
                const remaining =
                  debt.installment_value *
                  Math.max(0, debt.installments_total - debt.installments_paid)
                const progress =
                  debt.installments_total > 0
                    ? (debt.installments_paid / debt.installments_total) * 100
                    : 0
                return (
                  <Card
                    key={debt.id}
                    className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color + '20' }}
                        >
                          <Icon className="h-5 w-5" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
                            {debt.description}
                          </p>
                          <Badge
                            className="text-[10px]"
                            style={{ backgroundColor: meta.color + '20', color: meta.color }}
                          >
                            {meta.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block">Parcela</span>
                          <span className="font-bold text-gray-900 dark:text-foreground">
                            {formatBRL(debt.installment_value)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block">Restantes</span>
                          <span className="font-bold text-gray-900 dark:text-foreground">
                            {debt.installments_total - debt.installments_paid}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block">
                            Total restante
                          </span>
                          <span className="font-bold text-danger">{formatBRL(remaining)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                          <span>
                            {debt.installments_paid} de {debt.installments_total} parcelas
                          </span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* SEÇÃO 3 — Timeline mensal */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-foreground">Timeline mensal</h2>
        {loading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : chartData.length < 2 ? (
          <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pelo menos 2 meses de projeções são necessários para o gráfico.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisColor }}
                    tickFormatter={(v) => `R$ ${v}`}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => {
                      const count = props?.payload?.count ?? 0
                      return [`${formatBRL(value)} (${count} parcelas)`, 'Comprometido']
                    }}
                    labelFormatter={(label: string) => `Mês: ${label}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#colorIndigo)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </section>

      {/* SEÇÃO 4 — Resumo de comprometimento */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-foreground">
          Resumo de comprometimento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Comprometimento total futuro
                </span>
              </div>
              <p className="text-xl font-extrabold text-amber-700">{formatBRL(totalFuture)}</p>
              <p className="text-[11px] text-gray-400">
                Soma de todas as parcelas restantes futuras.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Recorrentes mensais (despesas)
                </span>
              </div>
              <p className="text-xl font-extrabold text-indigo-700">
                {formatBRL(recurringMonthly)}
              </p>
              <p className="text-[11px] text-gray-400">
                {activeRecurringExpenses.length}{' '}
                {activeRecurringExpenses.length === 1 ? 'conta fixa ativa' : 'contas fixas ativas'}{' '}
                · receitas: {formatBRL(recurringMonthlyIncome)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-danger" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Pico de comprometimento
                </span>
              </div>
              <p className="text-xl font-extrabold text-red-700">
                {peakMonth.key ? formatBRL(peakMonth.value) : '—'}
              </p>
              <p className="text-[11px] text-gray-400">
                {peakMonth.key
                  ? `Mês: ${getMonthName(parseInt(peakMonth.key.split('-')[1], 10) - 1)} ${peakMonth.key.split('-')[0]}`
                  : 'Sem dados suficientes.'}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Quitação prevista
                </span>
              </div>
              <p className="text-xl font-extrabold text-emerald-700">
                {lastMonth
                  ? `${getMonthName(parseInt(lastMonth.split('-')[1], 10) - 1)} ${lastMonth.split('-')[0]}`
                  : '—'}
              </p>
              <p className="text-[11px] text-gray-400">
                {isInvestmentTab
                  ? 'Data da última parcela de investimento restante.'
                  : 'Último mês com parcelas futuras previstas.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
