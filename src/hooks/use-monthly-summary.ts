import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import type { TransactionRecord } from '@/types/finance'

export interface MemberSummary {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  transactionCount: number
  transactions: TransactionRecord[]
}

export interface MonthlySummary {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  porcentagemGasta: number
  memberSummaries: Record<string, MemberSummary>
}

export function useMonthlySummary(familyId: string | undefined, year: number, month: number) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getTransactionsByFamilyAndMonth(familyId, year, month)
      setTransactions(data)
    } catch {
      setError('Erro ao carregar resumo. Tente novamente.')
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

  const summary = useMemo<MonthlySummary>(() => {
    const totalReceitas = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const totalDespesas = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const saldo = totalReceitas - totalDespesas
    const porcentagemGasta =
      totalReceitas > 0 ? Math.min((totalDespesas / totalReceitas) * 100, 100) : 0

    const memberSummaries: Record<string, MemberSummary> = {}
    for (const t of transactions) {
      if (!memberSummaries[t.owner_id]) {
        memberSummaries[t.owner_id] = {
          totalReceitas: 0,
          totalDespesas: 0,
          saldo: 0,
          transactionCount: 0,
          transactions: [],
        }
      }
      const ms = memberSummaries[t.owner_id]
      ms.transactionCount++
      ms.transactions.push(t)
      if (t.type === 'income') ms.totalReceitas += t.amount
      if (t.type === 'expense') ms.totalDespesas += t.amount
    }
    for (const ms of Object.values(memberSummaries)) {
      ms.saldo = ms.totalReceitas - ms.totalDespesas
      ms.transactions.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      ms.transactions = ms.transactions.slice(0, 5)
    }

    return { totalReceitas, totalDespesas, saldo, porcentagemGasta, memberSummaries }
  }, [transactions])

  return { summary, transactions, loading, error, refetch: loadData }
}
