import { useMemo } from 'react'
import type { DebtRecord } from '@/types/finance'

export type PayoffStrategy = 'snowball' | 'avalanche'

export interface PayoffResult {
  monthsToPayoff: number
  totalPaid: number
  totalInterest: number
  payoffOrder: Array<{ id: string; description: string; month: number; totalPaid: number }>
  monthlyBreakdown: Array<{ month: number; debts: Array<{ id: string; remaining: number }> }>
}

interface SimDebt {
  id: string
  description: string
  remaining: number
  installment: number
  interestRate: number
  totalPaid: number
}

export function simulatePayoff(
  debts: DebtRecord[],
  extraMonthly: number,
  strategy: PayoffStrategy,
): PayoffResult {
  const totalBudget = extraMonthly + debts.reduce((s, d) => s + d.installment_value, 0)
  const sim: SimDebt[] = debts.map((d) => ({
    id: d.id,
    description: d.description,
    remaining: d.remaining_amount,
    installment: d.installment_value,
    interestRate: d.interest_rate,
    totalPaid: 0,
  }))

  let month = 0
  let totalPaid = 0
  let totalInterest = 0
  const payoffOrder: PayoffResult['payoffOrder'] = []
  const monthlyBreakdown: PayoffResult['monthlyBreakdown'] = []
  const paidOff = new Set<string>()

  const sortByStrategy = (a: SimDebt, b: SimDebt) =>
    strategy === 'snowball' ? a.remaining - b.remaining : b.interestRate - a.interestRate

  while (paidOff.size < sim.length && month < 600) {
    month++
    for (const d of sim) {
      if (!paidOff.has(d.id)) {
        const interest = d.remaining * (d.interestRate / 100)
        d.remaining += interest
        totalInterest += interest
      }
    }
    let budget = totalBudget
    const active = sim.filter((d) => !paidOff.has(d.id))
    for (const d of active) {
      const payment = Math.min(d.installment, d.remaining, budget)
      d.remaining -= payment
      d.totalPaid += payment
      totalPaid += payment
      budget -= payment
      if (d.remaining <= 0.005) {
        paidOff.add(d.id)
        payoffOrder.push({ id: d.id, description: d.description, month, totalPaid: d.totalPaid })
      }
    }
    const targets = sim.filter((d) => !paidOff.has(d.id)).sort(sortByStrategy)
    for (const d of targets) {
      if (budget <= 0) break
      const payment = Math.min(budget, d.remaining)
      d.remaining -= payment
      d.totalPaid += payment
      totalPaid += payment
      budget -= payment
      if (d.remaining <= 0.005) {
        paidOff.add(d.id)
        payoffOrder.push({ id: d.id, description: d.description, month, totalPaid: d.totalPaid })
      }
    }
    monthlyBreakdown.push({
      month,
      debts: sim.map((d) => ({ id: d.id, remaining: Math.max(0, d.remaining) })),
    })
  }

  return { monthsToPayoff: month, totalPaid, totalInterest, payoffOrder, monthlyBreakdown }
}

export function useDebtPayoffStrategy(
  debts: DebtRecord[],
  extraMonthly: number,
  strategy: PayoffStrategy,
): PayoffResult | null {
  return useMemo(() => {
    if (!debts || debts.length === 0) return null
    return simulatePayoff(debts, extraMonthly, strategy)
  }, [debts, extraMonthly, strategy])
}
