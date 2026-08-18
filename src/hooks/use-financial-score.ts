import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getInvestmentsByFamilyId } from '@/services/investments'
import { getDebtsByFamilyId } from '@/services/debts'
import { getMembersByFamilyId } from '@/services/members'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import type { InvestmentRecord, DebtRecord, MemberRecord, TransactionRecord } from '@/types/finance'

export interface ScoreFactor {
  name: string
  score: number
  maxScore: number
  icon: string
  suggestion?: string
}

export interface FinancialScoreResult {
  score: number
  factors: ScoreFactor[]
  label: string
  color: string
}

const ESSENTIAL = ['moradia', 'alimentação', 'saúde', 'transporte', 'educação']

function getLabel(score: number): { label: string; color: string } {
  if (score <= 30) return { label: 'Crítico', color: '#EF4444' }
  if (score <= 50) return { label: 'Atenção', color: '#F97316' }
  if (score <= 70) return { label: 'Razoável', color: '#EAB308' }
  if (score <= 85) return { label: 'Bom', color: '#84CC16' }
  return { label: 'Excelente', color: '#22C55E' }
}

export function useFinancialScore(familyId: string | undefined) {
  const [investments, setInvestments] = useState<InvestmentRecord[]>([])
  const [debts, setDebts] = useState<DebtRecord[]>([])
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [tx3M, setTx3M] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setInvestments([])
      setDebts([])
      setMembers([])
      setTx3M([])
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
      const [inv, debt, mem, ...txArrays] = await Promise.all([
        getInvestmentsByFamilyId(familyId),
        getDebtsByFamilyId(familyId),
        getMembersByFamilyId(familyId),
        ...months.map((m) => getTransactionsByFamilyAndMonth(familyId, m.year, m.month)),
      ])
      setInvestments(inv)
      setDebts(debt)
      setMembers(mem)
      setTx3M(txArrays.flat())
    } catch {
      setError('Erro ao calcular score')
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

  const isEmpty =
    !loading && !error && tx3M.length === 0 && investments.length === 0 && debts.length === 0

  const result = useMemo<FinancialScoreResult | null>(() => {
    if (loading) return null
    const now = new Date()
    const mKeys = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const byMonth: Record<string, TransactionRecord[]> = {}
    for (const t of tx3M) {
      const k = t.transaction_date.substring(0, 7)
      if (!byMonth[k]) byMonth[k] = []
      byMonth[k].push(t)
    }
    const mExp = mKeys.map((k) =>
      (byMonth[k] || []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    )
    const avgExp = mExp.reduce((s, e) => s + e, 0) / 3 || 0
    const income = members.reduce((s, m) => s + (m.monthly_income || 0), 0)
    const totInv = investments.reduce((s, i) => s + i.current_value, 0)
    const totDebtPmt = debts.reduce((s, d) => s + d.installment_value, 0)

    const reserveMonths = avgExp > 0 ? Math.min(totInv / avgExp, 3) : 0
    const reserveScore = Math.round((reserveMonths / 3) * 20)

    const debtRatio = income > 0 ? (totDebtPmt / income) * 100 : 0
    const debtScore = income === 0 ? 0 : debtRatio < 20 ? 20 : debtRatio <= 30 ? 10 : 0

    const curTx = byMonth[mKeys[0]] || []
    const totExp = curTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const essExp = curTx
      .filter((t) => {
        if (t.type !== 'expense') return false
        const cn = t.expand?.category_id?.name?.toLowerCase() || ''
        return ESSENTIAL.some((e) => cn.includes(e))
      })
      .reduce((s, t) => s + t.amount, 0)
    const essRatio = totExp > 0 ? (essExp / totExp) * 100 : 0
    const essScore = totExp === 0 ? 0 : essRatio < 60 ? 20 : essRatio <= 75 ? 10 : 5

    // Consistência de investimento: conta meses (dos últimos 3) que tenham pelo
    // menos uma transação no fluxo de caixa com source='investment' ou
    // investment_id preenchido (aporte gerado pelo cadastro de investimento).
    let invMonths = 0
    for (const k of mKeys) {
      const invTxInMonth = (byMonth[k] || []).some(
        (t) => t.source === 'investment' || !!t.investment_id,
      )
      if (invTxInMonth) invMonths++
    }
    const invScore = invMonths === 3 ? 20 : invMonths === 2 ? 15 : invMonths === 1 ? 10 : 0

    let ctrlScore = 10
    if (mExp[1] > 0) {
      const chg = ((mExp[0] - mExp[1]) / mExp[1]) * 100
      ctrlScore = chg < 0 ? 20 : chg <= 5 ? 15 : chg <= 15 ? 10 : 0
    }

    const factors: ScoreFactor[] = [
      {
        name: 'Reserva de emergência',
        score: reserveScore,
        maxScore: 20,
        icon: 'shield',
        suggestion:
          reserveScore < 15
            ? `Sua reserva cobre ${reserveMonths.toFixed(1)} meses. Ideal: 3 meses.`
            : undefined,
      },
      {
        name: 'Relação dívida/renda',
        score: debtScore,
        maxScore: 20,
        icon: 'credit-card',
        suggestion:
          debtScore < 15 ? `Comprometimento: ${debtRatio.toFixed(1)}%. Ideal: < 20%.` : undefined,
      },
      {
        name: 'Gastos essenciais vs supérfluos',
        score: essScore,
        maxScore: 20,
        icon: 'pie-chart',
        suggestion: essScore < 15 ? `Essenciais: ${essRatio.toFixed(0)}% das despesas.` : undefined,
      },
      {
        name: 'Consistência de investimento',
        score: invScore,
        maxScore: 20,
        icon: 'trending-up',
        suggestion: invScore < 15 ? `Investiu em ${invMonths}/3 meses.` : undefined,
      },
      {
        name: 'Controle de gastos',
        score: ctrlScore,
        maxScore: 20,
        icon: 'wallet',
        suggestion: ctrlScore < 15 ? 'Monitore seus gastos mensais.' : undefined,
      },
    ]
    const score = factors.reduce((s, f) => s + f.score, 0)
    const { label, color } = getLabel(score)
    return { score, factors, label, color }
  }, [investments, debts, members, tx3M, loading])

  return {
    score: result?.score ?? 0,
    factors: result?.factors ?? [],
    label: result?.label ?? '',
    color: result?.color ?? '#E5E7EB',
    loading,
    error,
    isEmpty,
    refetch: loadData,
  }
}
