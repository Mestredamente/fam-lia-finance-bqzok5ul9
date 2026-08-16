import { useState } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { useFinancialScore } from '@/hooks/use-financial-score'
import { formatBRL, getProgressBarColor, cn } from '@/lib/utils'
import {
  getVariation,
  getVariationColor,
  formatVariation,
  buildVariationTooltip,
} from '@/lib/comparison-utils'

interface Props {
  familyId: string
  totalReceitas: number
  totalDespesas: number
  saldo: number
  porcentagemGasta: number
  loading: boolean
  error: string | null
  onRetry: () => void
  isFutureMonth?: boolean
  prevReceitas?: number
  prevDespesas?: number
  prevSaldo?: number
  prevMonthLabel?: string
  hasComparison?: boolean
}

/** Pequeno indicador de variação mês-a-mês usado nos 3 cards de resumo. */
function VariationBadge({
  current,
  previous,
  context,
  label,
}: {
  current: number
  previous: number
  context: 'income' | 'expense' | 'balance'
  label?: string
}) {
  const variation = getVariation(current, previous)
  const color = getVariationColor(variation.direction, context)
  const text = formatVariation(variation)
  const tooltip = buildVariationTooltip(previous, current, formatBRL)
  const fullTitle = label ? `${tooltip} vs ${label}` : tooltip
  return (
    <span title={fullTitle} className={cn('text-[10px] font-semibold whitespace-nowrap', color)}>
      {text}
      {label && variation.direction !== 'stable' && !variation.isNew ? ` vs ${label}` : ''}
    </span>
  )
}

export function UnifiedHealthCard({
  familyId,
  totalReceitas,
  totalDespesas,
  saldo,
  porcentagemGasta,
  loading,
  error,
  onRetry,
  isFutureMonth = false,
  prevReceitas,
  prevDespesas,
  prevSaldo,
  prevMonthLabel,
  hasComparison = false,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const {
    score,
    factors,
    label,
    color,
    loading: scoreLoading,
    isEmpty,
  } = useFinancialScore(familyId)

  if (loading) return <Skeleton className="h-40 rounded-2xl" />

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
  const barColor = hasIncome ? getProgressBarColor(porcentagemGasta) : 'bg-gray-300'
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const dashOffset = isEmpty ? circumference : circumference * (1 - score / 100)

  return (
    <Card className="border-none shadow-subtle rounded-2xl bg-white">
      <CardContent className="p-3 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-4 sm:block">
            <div
              className="relative w-16 h-16 shrink-0 cursor-pointer"
              onClick={() => !isEmpty && setExpanded(!expanded)}
            >
              <svg
                className="w-16 h-16"
                viewBox="0 0 100 100"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
                {!isEmpty && (
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {scoreLoading ? (
                  <span className="text-xs text-gray-400">...</span>
                ) : isEmpty ? (
                  <span className="text-xs text-gray-400">--</span>
                ) : (
                  <span className="text-lg font-extrabold" style={{ color }}>
                    {score}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2 sm:hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                {isFutureMonth ? 'Receitas previstas' : 'Receitas'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-[#166534]">
                  <AnimatedCounter value={totalReceitas} format={formatBRL} />
                </span>
                {hasComparison && prevReceitas != null && (
                  <VariationBadge
                    current={totalReceitas}
                    previous={prevReceitas}
                    context="income"
                    label={prevMonthLabel}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="text-xs font-medium text-gray-500">
                {isFutureMonth ? 'Despesas previstas' : 'Despesas'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-red-600">
                  <AnimatedCounter value={totalDespesas} format={formatBRL} />
                </span>
                {hasComparison && prevDespesas != null && (
                  <VariationBadge
                    current={totalDespesas}
                    previous={prevDespesas}
                    context="expense"
                    label={prevMonthLabel}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="text-xs font-medium text-gray-500">
                {isFutureMonth ? 'Saldo projetado' : 'Saldo'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-lg font-extrabold',
                    saldo >= 0 ? 'text-blue-700' : 'text-red-600',
                  )}
                >
                  <AnimatedCounter value={saldo} format={formatBRL} />
                </span>
                {hasComparison && prevSaldo != null && (
                  <VariationBadge
                    current={saldo}
                    previous={prevSaldo}
                    context="balance"
                    label={prevMonthLabel}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:grid sm:grid-cols-3 gap-3 flex-1">
            <div className="text-center">
              <span className="text-xs font-medium text-gray-500 block">
                {isFutureMonth ? 'Receitas previstas' : 'Receitas'}
              </span>
              <span className="text-xl font-extrabold text-[#166534]">
                <AnimatedCounter value={totalReceitas} format={formatBRL} />
              </span>
              {hasComparison && prevReceitas != null && (
                <VariationBadge
                  current={totalReceitas}
                  previous={prevReceitas}
                  context="income"
                  label={prevMonthLabel}
                />
              )}
            </div>
            <div className="text-center">
              <span className="text-xs font-medium text-gray-500 block">
                {isFutureMonth ? 'Despesas previstas' : 'Despesas'}
              </span>
              <span className="text-xl font-extrabold text-red-600">
                <AnimatedCounter value={totalDespesas} format={formatBRL} />
              </span>
              {hasComparison && prevDespesas != null && (
                <VariationBadge
                  current={totalDespesas}
                  previous={prevDespesas}
                  context="expense"
                  label={prevMonthLabel}
                />
              )}
            </div>
            <div className="text-center">
              <span className="text-xs font-medium text-gray-500 block">
                {isFutureMonth ? 'Saldo projetado' : 'Saldo'}
              </span>
              <span
                className={cn(
                  'text-xl font-extrabold',
                  saldo >= 0 ? 'text-blue-700' : 'text-red-600',
                )}
              >
                <AnimatedCounter value={saldo} format={formatBRL} />
              </span>
              {hasComparison && prevSaldo != null && (
                <VariationBadge
                  current={saldo}
                  previous={prevSaldo}
                  context="balance"
                  label={prevMonthLabel}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>Comprometimento de Renda</span>
            <span>
              {hasIncome ? `${Math.round(porcentagemGasta)}% das receitas` : 'Sem receita'}
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', barColor)}
              style={{ width: `${hasIncome ? Math.min(porcentagemGasta, 100) : 0}%` }}
            />
          </div>
        </div>

        {expanded && !isEmpty && (
          <div className="mt-3 space-y-1.5 animate-fade-in">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-bold" style={{ color }}>
                {label}
              </span>
              <ChevronDown className="h-3 w-3 rotate-180 text-gray-400" />
            </div>
            {factors.map((f) => (
              <div key={f.name} className="flex justify-between text-xs p-1.5 bg-gray-50 rounded">
                <span className="text-gray-600">{f.name}</span>
                <span className="font-bold text-gray-900">
                  {f.score}/{f.maxScore}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
