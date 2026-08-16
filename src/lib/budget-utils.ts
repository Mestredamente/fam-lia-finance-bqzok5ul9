import type { BudgetRecord } from '@/types/budgets'
import type { TransactionRecord } from '@/types/finance'

export interface BudgetProgress {
  budget: BudgetRecord
  spent: number
  /** 0..100+ (NOT capped at 100 — used to distinguish 99% vs 101%). */
  pct: number
  remaining: number
}

/**
 * Compute the spending progress for each budget given a list of transactions.
 * Filters expenses by category (and member when the budget is per-member).
 */
export function computeBudgetProgress(
  budgets: BudgetRecord[],
  transactions: TransactionRecord[],
): BudgetProgress[] {
  return budgets.map((b) => {
    const spent = transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.category_id === b.category_id &&
          (!b.member_id || t.owner_id === b.member_id),
      )
      .reduce((s, t) => s + t.amount, 0)
    const pct = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0
    return { budget: b, spent, pct, remaining: b.monthly_limit - spent }
  })
}

export type BudgetTone = 'ok' | 'attention' | 'alert' | 'exceeded'

export interface BudgetStatus {
  label: string
  tone: BudgetTone
}

/** Status bucket used by badges and inline warnings. */
export function getBudgetStatus(pct: number): BudgetStatus {
  if (pct >= 100) return { label: 'Estourado', tone: 'exceeded' }
  if (pct >= 80) return { label: 'Alerta', tone: 'alert' }
  if (pct >= 60) return { label: 'Atenção', tone: 'attention' }
  return { label: 'Dentro do limite', tone: 'ok' }
}

/** Tailwind classes for the thin progress bar based on percentage. */
export function budgetBarColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-orange-500'
  if (pct >= 60) return 'bg-yellow-500'
  return 'bg-emerald-500'
}
