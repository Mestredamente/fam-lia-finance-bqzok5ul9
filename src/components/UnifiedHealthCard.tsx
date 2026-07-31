import { useState } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { useFinancialScore } from '@/hooks/use-financial-score'
import { formatBRL, getProgressBarColor, cn } from '@/lib/utils'

interface Props {
  familyId: string
  totalReceitas: number
  totalDespesas: number
  saldo: number
  porcentagemGasta: number
  loading: boolean
  error: string | null
  onRetry: () => void
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
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
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

          <div className="flex-1 grid grid-cols-3 gap-3">
            <div className="text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Receitas</span>
              <span className="text-base font-extrabold text-[#166534]">
                <AnimatedCounter value={totalReceitas} format={formatBRL} />
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Despesas</span>
              <span className="text-base font-extrabold text-red-600">
                <AnimatedCounter value={totalDespesas} format={formatBRL} />
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 uppercase block">Saldo</span>
              <span
                className={cn(
                  'text-base font-extrabold',
                  saldo >= 0 ? 'text-blue-700' : 'text-red-600',
                )}
              >
                <AnimatedCounter value={saldo} format={formatBRL} />
              </span>
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
              <div
                key={f.name}
                className="flex justify-between text-[11px] p-1.5 bg-gray-50 rounded"
              >
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
