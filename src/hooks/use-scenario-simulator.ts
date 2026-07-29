import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getDebtsByFamilyId } from '@/services/debts'
import { getCategoriesByFamilyId } from '@/services/categories'
import { getInvestmentsByFamilyId } from '@/services/investments'
import { getMembersByFamilyId } from '@/services/members'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import type {
  DebtRecord,
  CategoryRecord,
  InvestmentRecord,
  MemberRecord,
  TransactionRecord,
} from '@/types/finance'

interface ScenarioData {
  debts: DebtRecord[]
  categories: CategoryRecord[]
  transactions: TransactionRecord[]
  investments: InvestmentRecord[]
  members: MemberRecord[]
}

export function useScenarioSimulator(familyId: string | undefined) {
  const [data, setData] = useState<ScenarioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const months = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        return { year: d.getFullYear(), month: d.getMonth() }
      })
      const [debts, categories, investments, members, ...txArrays] = await Promise.all([
        getDebtsByFamilyId(familyId),
        getCategoriesByFamilyId(familyId),
        getInvestmentsByFamilyId(familyId),
        getMembersByFamilyId(familyId),
        ...months.map((m) => getTransactionsByFamilyAndMonth(familyId, m.year, m.month)),
      ])
      setData({ debts, categories, transactions: txArrays.flat(), investments, members })
    } catch {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('transactions', () => loadData())
  useRealtime('investments', () => loadData())
  useRealtime('debts', () => loadData())

  const netWorth = useMemo(() => {
    if (!data) return 0
    const assets = data.investments.reduce((s, i) => s + i.current_value, 0)
    const liab = data.debts.reduce((s, d) => s + d.remaining_amount, 0)
    return assets - liab
  }, [data])

  const simulateCutExpense = (monthlySaving: number) => {
    const r = 0.1 / 12
    const invested = monthlySaving > 0 ? monthlySaving * ((Math.pow(1 + r, 12) - 1) / r) : 0
    return {
      annualSavings: monthlySaving * 12,
      investedValue: invested,
      projectedNetWorth: netWorth + invested,
    }
  }

  const simulateExtraIncome = (extra: number, invest: boolean) => {
    const r = 0.1 / 12
    const growth = invest && extra > 0 ? extra * ((Math.pow(1 + r, 12) - 1) / r) : extra * 12
    return {
      accumulation: extra * 12,
      compoundGrowth: growth,
      projectedNetWorth: netWorth + growth,
    }
  }

  const simulatePayoffDebt = (debtId: string) => {
    if (!data) return null
    const debt = data.debts.find((d) => d.id === debtId)
    if (!debt) return null
    const totalToPay = debt.installment_value * debt.installments_remaining
    const interestSaved = Math.max(0, totalToPay - debt.remaining_amount)
    return {
      interestSaved,
      freedCashFlow: debt.installment_value,
      timeLiberated: debt.installments_remaining,
      projectedNetWorth: netWorth + interestSaved,
    }
  }

  const simulateCutSubscriptions = () => {
    if (!data)
      return {
        subscriptions: [] as Array<{ name: string; monthly: number; annual: number }>,
        totalMonthly: 0,
        totalAnnual: 0,
        projectedNetWorth: netWorth,
      }
    const subCat = data.categories.find((c) => c.name.toLowerCase().includes('assinatura'))
    if (!subCat)
      return { subscriptions: [], totalMonthly: 0, totalAnnual: 0, projectedNetWorth: netWorth }
    const subTx = data.transactions.filter((t) => t.category_id === subCat.id)
    const groups: Record<string, TransactionRecord[]> = {}
    for (const t of subTx) {
      if (!groups[t.description]) groups[t.description] = []
      groups[t.description].push(t)
    }
    const subs = Object.entries(groups)
      .filter(([, txs]) => txs.length >= 2)
      .map(([name, txs]) => ({ name, monthly: txs[0].amount, annual: txs[0].amount * 12 }))
    const totalMonthly = subs.reduce((s, x) => s + x.monthly, 0)
    return {
      subscriptions: subs,
      totalMonthly,
      totalAnnual: totalMonthly * 12,
      projectedNetWorth: netWorth + totalMonthly * 12,
    }
  }

  const simulateHousingChange = (newCost: number) => {
    if (!data) return null
    const moradiaCat = data.categories.find((c) => c.name.toLowerCase().includes('moradia'))
    const now = new Date()
    const currentCost = moradiaCat
      ? data.transactions
          .filter(
            (t) =>
              t.category_id === moradiaCat.id &&
              new Date(t.transaction_date).getMonth() === now.getMonth() &&
              new Date(t.transaction_date).getFullYear() === now.getFullYear(),
          )
          .reduce((s, t) => s + t.amount, 0)
      : 0
    const diff = newCost - currentCost
    return {
      currentCost,
      monthlyDiff: diff,
      annualImpact: diff * 12,
      projectedNetWorth: netWorth - diff * 12,
    }
  }

  return {
    data,
    loading,
    error,
    netWorth,
    simulateCutExpense,
    simulateExtraIncome,
    simulatePayoffDebt,
    simulateCutSubscriptions,
    simulateHousingChange,
    refetch: loadData,
  }
}
