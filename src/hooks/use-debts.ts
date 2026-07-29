import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getDebtsByFamilyId } from '@/services/debts'
import { getMembersByFamilyId } from '@/services/members'
import type { DebtRecord, MemberRecord } from '@/types/finance'

export function useDebts(familyId: string | undefined, memberId?: string) {
  const [debts, setDebts] = useState<DebtRecord[]>([])
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setDebts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [debtData, memberData] = await Promise.all([
        getDebtsByFamilyId(familyId, memberId),
        getMembersByFamilyId(familyId),
      ])
      setDebts(debtData)
      setMembers(memberData)
    } catch {
      setError('Erro ao carregar dívidas')
    } finally {
      setLoading(false)
    }
  }, [familyId, memberId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('debts', () => {
    loadData()
  })

  const summary = useMemo(() => {
    const totalRemaining = debts.reduce((s, d) => s + d.remaining_amount, 0)
    const totalInstallments = debts.reduce((s, d) => s + d.installments_remaining, 0)
    const totalMonthlyPayment = debts.reduce((s, d) => s + d.installment_value, 0)
    const totalIncome = members.reduce((s, m) => s + (m.monthly_income || 0), 0)
    const incomeCommitment = totalIncome > 0 ? (totalMonthlyPayment / totalIncome) * 100 : null
    return { totalRemaining, totalInstallments, totalMonthlyPayment, incomeCommitment }
  }, [debts, members])

  return {
    debts,
    ...summary,
    loading,
    error,
    refetch: loadData,
  }
}
