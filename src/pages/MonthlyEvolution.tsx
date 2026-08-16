import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { FileDown, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { getActiveMembersByFamilyId } from '@/services/members'
import { getTransactionsByFamilyAndDateRange } from '@/services/transactions'
import { generateMonthlyPDF } from '@/lib/pdf-report'
import { formatBRL, cn } from '@/lib/utils'
import type { TransactionRecord, MemberRecord } from '@/types/finance'

const MONTH_SHORT = [
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

export default function MonthlyEvolution() {
  const { family } = useAuth()
  const [months, setMonths] = useState(12)
  const [memberFilter, setMemberFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'bar' | 'line'>('bar')
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (family)
      getActiveMembersByFamilyId(family.id)
        .then(setMembers)
        .catch(() => {})
  }, [family?.id])

  const loadData = async () => {
    if (!family) return
    setLoading(true)
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`
    try {
      const result = await getTransactionsByFamilyAndDateRange(family.id, startDate, endDate)
      console.log('[MonthlyEvolution] loadData', {
        startDate,
        endDate,
        familyId: family.id,
        count: result.length,
      })
      setTransactions(result)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [family?.id, months])
  useRealtime('transactions', () => {
    loadData()
  })

  const chartData = useMemo(() => {
    const filtered =
      memberFilter === 'all'
        ? transactions
        : transactions.filter((t) => t.owner_id === memberFilter)
    const result: { month: string; income: number; expenses: number }[] = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth(),
        y = d.getFullYear()
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const endM = m === 11 ? 0 : m + 1,
        endY = m === 11 ? y + 1 : y
      const end = `${endY}-${String(endM + 1).padStart(2, '0')}-01`
      const monthTx = filtered.filter(
        (t) => t.transaction_date >= start && t.transaction_date < end,
      )
      result.push({
        month: `${MONTH_SHORT[m]}/${String(y).slice(2)}`,
        income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      })
    }
    return result
  }, [transactions, months, memberFilter])

  const totalIncome = chartData.reduce((s, d) => s + d.income, 0)
  const totalExpenses = chartData.reduce((s, d) => s + d.expenses, 0)

  const handlePDF = () => {
    const now = new Date()
    const curTx = transactions.filter((t) => {
      const d = new Date(t.transaction_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const prevTx = transactions.filter((t) => {
      const d = new Date(t.transaction_date)
      return d.getMonth() === prevM && d.getFullYear() === prevY
    })
    generateMonthlyPDF(
      curTx,
      now.getMonth(),
      now.getFullYear(),
      prevTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      prevTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    )
  }

  if (!family)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    )

  const config: ChartConfig = {
    income: { label: 'Receitas', color: 'hsl(142, 71%, 45%)' },
    expenses: { label: 'Despesas', color: 'hsl(0, 84%, 60%)' },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Evolução Mensal</h1>
        <Button variant="outline" size="sm" onClick={handlePDF}>
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">PDF</span>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {[3, 6, 12].map((m) => (
            <Button
              key={m}
              variant={months === m ? 'default' : 'outline'}
              size="sm"
              className={cn('h-8 px-2 text-xs', months === m && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setMonths(m)}
            >
              {m}m
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'bar' ? 'default' : 'outline'}
            size="sm"
            className={cn('h-8 px-2 text-xs', viewMode === 'bar' && 'bg-[#166534]')}
            onClick={() => setViewMode('bar')}
          >
            Barras
          </Button>
          <Button
            variant={viewMode === 'line' ? 'default' : 'outline'}
            size="sm"
            className={cn('h-8 px-2 text-xs', viewMode === 'line' && 'bg-[#166534]')}
            onClick={() => setViewMode('line')}
          >
            Linhas
          </Button>
        </div>
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="text-xs border rounded-lg px-2 py-1.5 bg-white max-w-[140px]"
        >
          <option value="all">Todos</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
          <CardContent className="p-3 sm:p-5">
            <h3 className="font-bold text-sm text-gray-900 mb-4">Receitas x Despesas</h3>
            <ChartContainer config={config} className="h-72 w-full">
              {viewMode === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="income"
                    stroke="var(--color-income)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    dataKey="expenses"
                    stroke="var(--color-expenses)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-subtle bg-[#F0FDF4] rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Receitas (total)
              </span>
              <span className="text-xl font-extrabold text-[#166534] block">
                {formatBRL(totalIncome)}
              </span>
            </div>
            <TrendingUp className="h-8 w-8 text-[#166534]" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-subtle bg-[#FEF2F2] rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Despesas (total)
              </span>
              <span className="text-xl font-extrabold text-red-600 block">
                {formatBRL(totalExpenses)}
              </span>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-subtle bg-[#EFF6FF] rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Saldo</span>
              <span className="text-xl font-extrabold text-blue-700 block">
                {formatBRL(totalIncome - totalExpenses)}
              </span>
            </div>
            <Wallet className="h-8 w-8 text-blue-700" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
