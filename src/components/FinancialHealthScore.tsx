import { useState } from 'react'
import { Shield, CreditCard, PieChart, TrendingUp, Wallet, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinancialScore } from '@/hooks/use-financial-score'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, typeof Shield> = {
  shield: Shield,
  'credit-card': CreditCard,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  wallet: Wallet,
}

export function FinancialHealthScore({ familyId }: { familyId: string }) {
  const [expanded, setExpanded] = useState(false)
  const { score, factors, label, color, loading, error, isEmpty } = useFinancialScore(familyId)

  if (loading) return <Skeleton className="h-32 rounded-2xl" />
  if (error)
    return (
      <Card className="border-red-200 rounded-2xl">
        <CardContent className="p-4 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    )
  if (isEmpty)
    return (
      <Card className="border-dashed border-gray-200 rounded-2xl">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-gray-500">
            Adicione transações e investimentos para calcular seu score de saúde financeira.
          </p>
        </CardContent>
      </Card>
    )

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - score / 100)

  return (
    <Card
      className="border-none shadow-subtle rounded-2xl bg-white cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg
              className="w-20 h-20"
              viewBox="0 0 100 100"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold" style={{ color }}>
                {score}
              </span>
              <span className="text-[9px] text-gray-400">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900">Saúde Financeira</h3>
            <span className="text-lg font-extrabold" style={{ color }}>
              {label}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-500">Ver detalhes</span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 text-gray-400 transition-transform',
                  expanded && 'rotate-180',
                )}
              />
            </div>
          </div>
        </div>
        {expanded && (
          <div className="mt-4 space-y-2 animate-fade-in">
            {factors.map((f) => {
              const Icon = ICON_MAP[f.icon] || Shield
              return (
                <div key={f.name} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <Icon className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{f.name}</span>
                      <span className="font-bold text-gray-900">
                        {f.score}/{f.maxScore}
                      </span>
                    </div>
                    {f.suggestion && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{f.suggestion}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
