import { useState } from 'react'
import { Snowflake, Mountain, Calculator, Save, RotateCcw, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/CurrencyInput'
import { cn, formatBRL } from '@/lib/utils'
import {
  simulatePayoff,
  type PayoffStrategy,
  type PayoffResult,
} from '@/hooks/use-debt-payoff-strategy'
import { updateFamily } from '@/services/families'
import { toast } from '@/hooks/use-toast'
import type { DebtRecord } from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  debts: DebtRecord[]
  familyId: string
}

function formatMonths(total: number): string {
  const y = Math.floor(total / 12)
  const m = total % 12
  if (y === 0) return `${m} meses`
  if (m === 0) return `${y} ano(s)`
  return `${y} ano(s) e ${m} mês(es)`
}

const STRATEGIES = [
  {
    value: 'snowball' as const,
    label: 'Bola de Neve',
    icon: Snowflake,
    desc: 'Menor saldo primeiro',
  },
  { value: 'avalanche' as const, label: 'Avalanche', icon: Mountain, desc: 'Maior juros primeiro' },
]

const COLORS = [
  '#22C55E',
  '#3B82F6',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
  '#F97316',
]

export function DebtPayoffCalculator({ open, onOpenChange, debts, familyId }: Props) {
  const [strategy, setStrategy] = useState<PayoffStrategy>('snowball')
  const [extraMonthly, setExtraMonthly] = useState(0)
  const [results, setResults] = useState<{ chosen: PayoffResult; other: PayoffResult } | null>(null)
  const [view, setView] = useState<'config' | 'results'>('config')
  const [saving, setSaving] = useState(false)

  const handleCalculate = () => {
    try {
      const chosen = simulatePayoff(debts, extraMonthly, strategy)
      const other = simulatePayoff(
        debts,
        extraMonthly,
        strategy === 'snowball' ? 'avalanche' : 'snowball',
      )
      setResults({ chosen, other })
      setView('results')
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao calcular simulação' })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateFamily(familyId, {
        payoff_plan: { strategy, extraMonthly, calculatedAt: new Date().toISOString() },
      })
      toast({ title: 'Plano de quitação salvo. Acompanhe seu progresso na lista de dívidas.' })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar plano' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setResults(null)
    setView('config')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Simular Quitação de Dívidas</SheetTitle>
        </SheetHeader>
        {debts.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-gray-500">Você não tem dívidas ativas. Parabéns! 🎉</p>
            <Button onClick={() => onOpenChange(false)}>Voltar</Button>
          </div>
        ) : view === 'config' ? (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold text-gray-700">Valor extra mensal</label>
              <CurrencyInput value={extraMonthly} onChange={setExtraMonthly} />
              <p className="text-xs text-gray-400 mt-1">
                Valor adicional para acelerar a quitação.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Estratégia</label>
              {STRATEGIES.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.value}
                    onClick={() => setStrategy(s.value)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all',
                      strategy === s.value
                        ? 'border-[#22C55E] bg-emerald-50'
                        : 'border-gray-200 bg-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        strategy === s.value ? 'text-[#22C55E]' : 'text-gray-400',
                      )}
                    />
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">{s.label}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <Button onClick={handleCalculate} className="w-full bg-[#166534] hover:bg-[#15803D]">
              <Calculator className="h-4 w-4 mr-2" /> Calcular
            </Button>
          </div>
        ) : results ? (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-50 rounded-xl space-y-1">
                <h4 className="text-sm font-bold text-[#166534]">
                  {STRATEGIES.find((s) => s.value === strategy)!.label}
                </h4>
                <p className="text-xs text-gray-600">
                  {formatMonths(results.chosen.monthsToPayoff)}
                </p>
                <div className="text-xs space-y-0.5">
                  <p>
                    Total pago:{' '}
                    <span className="font-bold">{formatBRL(results.chosen.totalPaid)}</span>
                  </p>
                  <p className="text-red-600">
                    Juros:{' '}
                    <span className="font-bold">{formatBRL(results.chosen.totalInterest)}</span>
                  </p>
                  <p>
                    Quitadas: <span className="font-bold">{results.chosen.payoffOrder.length}</span>
                  </p>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl space-y-1">
                <h4 className="text-sm font-bold text-blue-700">
                  {STRATEGIES.find((s) => s.value !== strategy)!.label} (comparação)
                </h4>
                <p className="text-xs text-gray-600">
                  {formatMonths(results.other.monthsToPayoff)}
                </p>
                <div className="text-xs space-y-0.5">
                  <p>
                    Total pago:{' '}
                    <span className="font-bold">{formatBRL(results.other.totalPaid)}</span>
                  </p>
                  <p className="text-red-600">
                    Juros:{' '}
                    <span className="font-bold">{formatBRL(results.other.totalInterest)}</span>
                  </p>
                  <p>
                    Quitadas: <span className="font-bold">{results.other.payoffOrder.length}</span>
                  </p>
                </div>
                {Math.abs(results.chosen.monthsToPayoff - results.other.monthsToPayoff) < 1 &&
                Math.abs(results.chosen.totalInterest - results.other.totalInterest) < 100 ? (
                  <p className="text-xs text-gray-500 italic">
                    As duas estratégias têm resultados muito próximos
                  </p>
                ) : (
                  <p className="text-xs text-blue-600">
                    Diferença:{' '}
                    {Math.abs(results.chosen.monthsToPayoff - results.other.monthsToPayoff)} meses,{' '}
                    {formatBRL(
                      Math.abs(results.chosen.totalInterest - results.other.totalInterest),
                    )}{' '}
                    em juros
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900">Ordem de quitação</h4>
              {results.chosen.payoffOrder.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium text-gray-700">{d.description}</span>
                  <span className="text-gray-500">Mês {d.month}</span>
                  <span className="font-bold text-gray-900">{formatBRL(d.totalPaid)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900">Linha do tempo</h4>
              {results.chosen.payoffOrder.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-20 truncate">{d.description}</span>
                  <div className="flex-1 bg-gray-100 h-6 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(d.month / results.chosen.monthsToPayoff) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    >
                      <span className="text-[9px] text-white font-bold">Mês {d.month}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" /> Refazer
              </Button>
              <Button
                className="flex-1 bg-[#166534] hover:bg-[#15803D]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}{' '}
                Salvar plano
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
