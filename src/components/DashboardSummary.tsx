import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { PeriodSelector } from '@/components/PeriodSelector'
import { formatBRL, getProgressBarColor } from '@/lib/utils'
import { type PeriodType } from '@/lib/period-utils'

interface DashboardSummaryProps {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  porcentagemGasta: number
  loading: boolean
  error: string | null
  onRetry: () => void
  period?: PeriodType
  onPeriodChange?: (period: PeriodType) => void
  otherMonthsCount?: number
  onPrevMonth?: () => void
  onNextMonth?: () => void
  monthLabel?: string
  year?: number
  month?: number
}

export function DashboardSummary({
  totalReceitas,
  totalDespesas,
  saldo,
  porcentagemGasta,
  loading,
  error,
  onRetry,
  period = 'mes',
  onPeriodChange,
  otherMonthsCount = 0,
  onPrevMonth,
  onNextMonth,
  monthLabel,
  year,
  month,
}: DashboardSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 rounded-2xl">
        <CardContent className="p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{error}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  const hasIncome = totalReceitas > 0
  const isEmpty = totalReceitas === 0 && totalDespesas === 0
  const isAllView = period === 'tudo'
  const barColor = hasIncome ? getProgressBarColor(porcentagemGasta) : 'bg-gray-300'
  const barText = hasIncome
    ? `${Math.round(porcentagemGasta)}% das receitas`
    : 'Sem receita registrada'
  const subText = isEmpty
    ? 'Adicione transações para ver seu resumo'
    : hasIncome
      ? `Você já gastou ${Math.round(porcentagemGasta)}% da sua renda${isAllView ? ' (total)' : ' deste mês'}`
      : 'Sem receita registrada'

  return (
    <div className="space-y-4">
      {onPeriodChange && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <PeriodSelector
            period={period}
            onPeriodChange={onPeriodChange}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            monthLabel={monthLabel}
            year={year}
            month={month}
          />
          {!isAllView && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => onPeriodChange('tudo')}
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver todas
            </Button>
          )}
        </div>
      )}

      {otherMonthsCount > 0 && !isAllView && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700">
            Você tem {otherMonthsCount} {otherMonthsCount === 1 ? 'transação' : 'transações'} em
            outros meses. Use as setas para navegar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-subtle bg-[#F0FDF4] rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Receitas
              </span>
              <span className="text-2xl font-extrabold text-[#166534] transition-all duration-300">
                <AnimatedCounter value={totalReceitas} format={formatBRL} />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-[#166534]">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-subtle bg-[#FEF2F2] rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Despesas
              </span>
              <span className="text-2xl font-extrabold text-red-600 transition-all duration-300">
                <AnimatedCounter value={totalDespesas} format={formatBRL} />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-subtle bg-[#EFF6FF] rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                {isAllView ? 'Saldo geral' : 'Saldo do mês'}
              </span>
              <span className="text-2xl font-extrabold text-blue-700 transition-all duration-300">
                <AnimatedCounter value={saldo} format={formatBRL} />
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Wallet className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-gray-400 text-center">{subText}</p>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>Comprometimento de Renda</span>
            <span>{barText}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${hasIncome ? Math.min(porcentagemGasta, 100) : 0}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
