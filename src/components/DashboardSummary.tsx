import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AnimatedCounter } from '@/components/AnimatedCounter'
import { formatBRL, getProgressBarColor } from '@/lib/utils'

interface DashboardSummaryProps {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  porcentagemGasta: number
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function DashboardSummary({
  totalReceitas,
  totalDespesas,
  saldo,
  porcentagemGasta,
  loading,
  error,
  onRetry,
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
  const barColor = hasIncome ? getProgressBarColor(porcentagemGasta) : 'bg-gray-300'
  const barText = hasIncome
    ? `${Math.round(porcentagemGasta)}% das receitas`
    : 'Sem receita registrada'
  const subText = isEmpty
    ? 'Adicione transações para ver seu resumo'
    : hasIncome
      ? `Você já gastou ${Math.round(porcentagemGasta)}% da sua renda deste mês`
      : 'Sem receita registrada'

  return (
    <div className="space-y-4">
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
                Saldo do mês
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
