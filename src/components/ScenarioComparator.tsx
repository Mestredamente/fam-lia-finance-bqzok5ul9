import { useState, useEffect } from 'react'
import { Scissors, TrendingUp, CreditCard, Tv, Home } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CurrencyInput } from '@/components/CurrencyInput'
import { useScenarioSimulator } from '@/hooks/use-scenario-simulator'
import { cn, formatBRL } from '@/lib/utils'

const SCENARIOS = [
  { id: 'cut-expense', label: 'Cortar um gasto mensal', icon: Scissors },
  { id: 'extra-income', label: 'Aumentar a renda', icon: TrendingUp },
  { id: 'payoff-debt', label: 'Quitar uma dívida', icon: CreditCard },
  { id: 'cut-subscriptions', label: 'Cortar assinaturas', icon: Tv },
  { id: 'housing-change', label: 'Mudança de moradia', icon: Home },
]

function MiniBar({ current, projected }: { current: number; projected: number }) {
  const max = Math.max(Math.abs(current), Math.abs(projected), 1)
  return (
    <div className="flex items-end gap-2 h-16 mt-2">
      <div className="flex-1 flex flex-col items-center gap-1">
        <div
          className="w-full bg-gray-200 rounded-t"
          style={{ height: `${(Math.abs(current) / max) * 100}%` }}
        />
        <span className="text-xs text-gray-500">Atual</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <div
          className="w-full bg-[#22C55E] rounded-t"
          style={{ height: `${(Math.abs(projected) / max) * 100}%` }}
        />
        <span className="text-xs text-gray-500">12 meses</span>
      </div>
    </div>
  )
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  familyId: string
  initialScenario?: string
}

export function ScenarioComparator({ open, onOpenChange, familyId, initialScenario }: Props) {
  const sim = useScenarioSimulator(familyId)
  const [selected, setSelected] = useState('cut-expense')
  const [cutAmount, setCutAmount] = useState(0)
  const [incomeAmount, setIncomeAmount] = useState(0)
  const [investIncome, setInvestIncome] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState('')
  const [newHousing, setNewHousing] = useState(0)

  useEffect(() => {
    if (open && initialScenario) setSelected(initialScenario)
  }, [open, initialScenario])

  const expenseCats = sim.data?.categories.filter((c) => c.type === 'expense') || []
  const subResult = sim.simulateCutSubscriptions()
  const debtResult = selectedDebt ? sim.simulatePayoffDebt(selectedDebt) : null
  const housingResult = sim.simulateHousingChange(newHousing)
  const cutResult = sim.simulateCutExpense(cutAmount)
  const incomeResult = sim.simulateExtraIncome(incomeAmount, investIncome)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>E se...?</DialogTitle>
        </DialogHeader>
        {sim.loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : sim.error ? (
          <p className="text-sm text-red-600 text-center">{sim.error}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid md:grid-cols-[200px_1fr] gap-3">
              <div className="space-y-1">
                {SCENARIOS.map((s) => {
                  const Icon = s.icon
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s.id)}
                      className={cn(
                        'w-full p-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-center gap-2',
                        selected === s.id
                          ? 'bg-[#166534] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" /> {s.label}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-3 min-h-[200px]">
                {selected === 'cut-expense' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Selecione uma categoria e quanto economizar por mês.
                    </p>
                    <Select value={expenseCats[0]?.id} onValueChange={() => {}}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCats.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <CurrencyInput value={cutAmount} onChange={setCutAmount} />
                    {cutAmount > 0 && (
                      <div className="text-xs space-y-1 p-3 bg-emerald-50 rounded-xl">
                        <p>
                          Economia anual:{' '}
                          <span className="font-bold">{formatBRL(cutResult.annualSavings)}</span>
                        </p>
                        <p>
                          Valor investido (10% a.a.):{' '}
                          <span className="font-bold">{formatBRL(cutResult.investedValue)}</span>
                        </p>
                        <MiniBar current={sim.netWorth} projected={cutResult.projectedNetWorth} />
                      </div>
                    )}
                  </div>
                )}
                {selected === 'extra-income' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Quanto de renda extra por mês?</p>
                    <CurrencyInput value={incomeAmount} onChange={setIncomeAmount} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">Aplicar em investimentos</span>
                      <Switch checked={investIncome} onCheckedChange={setInvestIncome} />
                    </div>
                    {incomeAmount > 0 && (
                      <div className="text-xs space-y-1 p-3 bg-emerald-50 rounded-xl">
                        <p>
                          Acumulado em 12 meses:{' '}
                          <span className="font-bold">{formatBRL(incomeResult.accumulation)}</span>
                        </p>
                        <p>
                          Crescimento composto:{' '}
                          <span className="font-bold">
                            {formatBRL(incomeResult.compoundGrowth)}
                          </span>
                        </p>
                        <MiniBar
                          current={sim.netWorth}
                          projected={incomeResult.projectedNetWorth}
                        />
                      </div>
                    )}
                  </div>
                )}
                {selected === 'payoff-debt' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Selecione uma dívida para quitar.</p>
                    <Select value={selectedDebt} onValueChange={setSelectedDebt}>
                      <SelectTrigger>
                        <SelectValue placeholder="Dívida" />
                      </SelectTrigger>
                      <SelectContent>
                        {(sim.data?.debts || []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {debtResult && (
                      <div className="text-xs space-y-1 p-3 bg-emerald-50 rounded-xl">
                        <p>
                          Juros economizados:{' '}
                          <span className="font-bold text-[#166534]">
                            {formatBRL(debtResult.interestSaved)}
                          </span>
                        </p>
                        <p>
                          Fluxo de caixa liberado:{' '}
                          <span className="font-bold">
                            {formatBRL(debtResult.freedCashFlow)}/mês
                          </span>
                        </p>
                        <p>
                          Tempo liberado:{' '}
                          <span className="font-bold">{debtResult.timeLiberated} meses</span>
                        </p>
                        <MiniBar current={sim.netWorth} projected={debtResult.projectedNetWorth} />
                      </div>
                    )}
                  </div>
                )}
                {selected === 'cut-subscriptions' && (
                  <div className="space-y-2">
                    {subResult.subscriptions.length === 0 ? (
                      <p className="text-xs text-gray-500">Nenhuma assinatura encontrada.</p>
                    ) : (
                      <>
                        <div className="text-xs space-y-1 p-3 bg-emerald-50 rounded-xl">
                          <p>
                            Total mensal:{' '}
                            <span className="font-bold">{formatBRL(subResult.totalMonthly)}</span>
                          </p>
                          <p>
                            Total anual:{' '}
                            <span className="font-bold">{formatBRL(subResult.totalAnnual)}</span>
                          </p>
                          <p>
                            Cancelando todas, economizaria{' '}
                            <span className="font-bold">{formatBRL(subResult.totalAnnual)}</span> em
                            12 meses.
                          </p>
                        </div>
                        <div className="space-y-1">
                          {subResult.subscriptions.map((s) => (
                            <div
                              key={s.name}
                              className="flex justify-between text-xs p-2 bg-gray-50 rounded-lg"
                            >
                              <span className="font-medium text-gray-700">{s.name}</span>
                              <span>
                                {formatBRL(s.monthly)}/mês • {formatBRL(s.annual)}/ano
                              </span>
                            </div>
                          ))}
                        </div>
                        <MiniBar current={sim.netWorth} projected={subResult.projectedNetWorth} />
                      </>
                    )}
                  </div>
                )}
                {selected === 'housing-change' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Simule o impacto de mudar de moradia.</p>
                    <div>
                      <label className="text-xs text-gray-500">Atual (Moradia)</label>
                      <p className="text-sm font-bold">
                        {formatBRL(housingResult?.currentCost || 0)}/mês
                      </p>
                    </div>
                    <CurrencyInput value={newHousing} onChange={setNewHousing} />
                    {newHousing > 0 && housingResult && (
                      <div className="text-xs space-y-1 p-3 bg-emerald-50 rounded-xl">
                        <p>
                          Diferença mensal:{' '}
                          <span className="font-bold">{formatBRL(housingResult.monthlyDiff)}</span>
                        </p>
                        <p>
                          Impacto anual:{' '}
                          <span className="font-bold">{formatBRL(housingResult.annualImpact)}</span>
                        </p>
                        <MiniBar
                          current={sim.netWorth}
                          projected={housingResult.projectedNetWorth}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center italic">
              Simulações baseadas em dados atuais. Resultados reais podem variar.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
