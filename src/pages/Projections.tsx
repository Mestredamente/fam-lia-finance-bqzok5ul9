import { useMemo, useEffect, useState } from 'react'
import {
  CalendarClock,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  AlertCircle,
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
import { useFutureInstallments } from '@/hooks/use-future-installments'
import { useDebts } from '@/hooks/use-debts'
import { getActiveMembersByFamilyId } from '@/services/members'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatBRL, getMonthName } from '@/lib/utils'
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
  const [filter, setFilter] = useState<'all' | 'card' | 'debt' | 'investment'>('all')
  const [monthlyIncome, setMonthlyIncome] = useState(0)

  useEffect(() => {
    if (!family) return
    getActiveMembersByFamilyId(family.id)
      .then((members) => setMonthlyIncome(members.reduce((s, m) => s + (m.monthly_income || 0), 0)))
      .catch(() => setMonthlyIncome(0))
  }, [family?.id])

  const filteredInstallments = useMemo(() => {
    if (filter === 'all') return installments
    return installments.filter((t) => {
      // Heurística de tipo da parcela futura:
      // debt_payment -> Dívida; investment -> Investimento; demais -> Cartão
      if (filter === 'debt') return t.type === 'debt_payment'
      if (filter === 'investment') return t.type === 'investment'
      if (filter === 'card') return t.type !== 'debt_payment' && t.type !== 'investment'
      return true
    })
  }, [installments, filter])

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

  const monthlyCommitment = monthlyIncome > 0 ? (totalFuture / monthlyIncome) * 100 : null

  const loading = installmentsLoading || debtsLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projeções Financeiras</h1>
          <p className="text-xs text-gray-500">
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
          <TabsTrigger value="investment">Investimento</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SEÇÃO 1 — Comprometimento futuro em parcelas */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900">Comprometimento futuro em parcelas</h2>
        {loading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : filteredInstallments.length === 0 ? (
          <Card className="border-dashed border-gray-200 rounded-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <Calendar className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">Nenhuma parcela futura cadastrada.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Total consolidado</span>
                  <span className="text-2xl font-extrabold text-amber-700">
                    {formatBRL(totalFuture)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({totalInstallments} {totalInstallments === 1 ? 'parcela' : 'parcelas'})
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
              <CardContent className="p-5 space-y-3">
                {monthlyMap.map(([key, data]) => {
                  const widthPct = maxValue > 0 ? (data.total / maxValue) * 100 : 0
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">
                          {getMonthName(parseInt(key.split('-')[1], 10) - 1)} {key.split('-')[0]}
                        </span>
                        <span className="text-gray-600">
                          {formatBRL(data.total)} ({data.count}{' '}
                          {data.count === 1 ? 'parcela' : 'parcelas'})
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-500"
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
        <h2 className="text-base font-bold text-gray-900">Dívidas em pagamento</h2>
        {loading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : activeDebts.length === 0 ? (
          <Card className="border-dashed border-gray-200 rounded-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <Wallet className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">Nenhuma dívida ativa.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border border-red-200 bg-red-50 rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">
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
                    className="border border-gray-100 shadow-subtle rounded-2xl bg-white"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color + '20' }}
                        >
                          <Icon className="h-5 w-5" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">
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
                          <span className="text-gray-500 block">Parcela</span>
                          <span className="font-bold text-gray-900">
                            {formatBRL(debt.installment_value)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Restantes</span>
                          <span className="font-bold text-gray-900">
                            {debt.installments_total - debt.installments_paid}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Total restante</span>
                          <span className="font-bold text-red-600">{formatBRL(remaining)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500">
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
        <h2 className="text-base font-bold text-gray-900">Timeline mensal</h2>
        {loading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : chartData.length < 2 ? (
          <Card className="border-dashed border-gray-200 rounded-2xl">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                Pelo menos 2 meses de projeções são necessários para o gráfico.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
            <CardContent className="p-5">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
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
        <h2 className="text-base font-bold text-gray-900">Resumo de comprometimento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-gray-500">
                  Comprometimento total futuro
                </span>
              </div>
              <p className="text-xl font-extrabold text-amber-700">{formatBRL(totalFuture)}</p>
              <p className="text-[11px] text-gray-400">
                Soma de todas as parcelas restantes futuras.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold text-gray-500">Comprometimento mensal</span>
              </div>
              <p className="text-xl font-extrabold text-indigo-700">
                {monthlyCommitment !== null ? `${monthlyCommitment.toFixed(1)}%` : '—'}
              </p>
              <p className="text-[11px] text-gray-400">
                {monthlyCommitment !== null
                  ? 'Percentual da renda mensal da família.'
                  : 'Renda mensal não informada.'}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-gray-500">Pico de comprometimento</span>
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

          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-gray-500">Quitação prevista</span>
              </div>
              <p className="text-xl font-extrabold text-emerald-700">
                {lastMonth
                  ? `${getMonthName(parseInt(lastMonth.split('-')[1], 10) - 1)} ${lastMonth.split('-')[0]}`
                  : '—'}
              </p>
              <p className="text-[11px] text-gray-400">
                Último mês com parcelas futuras previstas.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
