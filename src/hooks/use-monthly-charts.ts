import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getTransactionsByFamilyAndDateRange } from '@/services/transactions'
import type { TransactionRecord } from '@/types/finance'

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

function pad(n: number) {
  return String(n + 1).padStart(2, '0')
}

export function useMonthlyCharts(familyId: string | undefined, year: number, month: number) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const start = new Date(year, month - 11, 1)
      const end = new Date(year, month + 1, 1)
      const startDate = `${start.getFullYear()}-${pad(start.getMonth())}-01`
      const endDate = `${end.getFullYear()}-${pad(end.getMonth())}-01`
      const data = await getTransactionsByFamilyAndDateRange(familyId, startDate, endDate)
      setTransactions(data)
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [familyId, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    loadData()
  })

  const expensesByCategory = useMemo(() => {
    const startDate = `${year}-${pad(month)}-01`
    const endM = month === 11 ? 0 : month + 1
    const endY = month === 11 ? year + 1 : year
    const endDate = `${endY}-${pad(endM)}-01`
    const monthExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' && t.transaction_date >= startDate && t.transaction_date < endDate,
    )
    const byCat: Record<string, { name: string; value: number; color: string }> = {}
    for (const t of monthExpenses) {
      const catName = t.expand?.category_id?.name || 'Sem categoria'
      const catColor = t.expand?.category_id?.color || '#999999'
      if (!byCat[catName]) byCat[catName] = { name: catName, value: 0, color: catColor }
      byCat[catName].value += t.amount
    }
    return Object.values(byCat).sort((a, b) => b.value - a.value)
  }, [transactions, year, month])

  const monthlyComparison = useMemo(() => {
    const result: { month: string; income: number; expenses: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const startDate = `${y}-${pad(m)}-01`
      const endM = m === 11 ? 0 : m + 1
      const endY = m === 11 ? y + 1 : y
      const endDate = `${endY}-${pad(endM)}-01`
      const monthTx = transactions.filter(
        (t) => t.transaction_date >= startDate && t.transaction_date < endDate,
      )
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      result.push({ month: `${MONTH_NAMES_SHORT[m]}/${String(y).slice(2)}`, income, expenses })
    }
    return result
  }, [transactions, year, month])

  return { expensesByCategory, monthlyComparison, loading }
}
