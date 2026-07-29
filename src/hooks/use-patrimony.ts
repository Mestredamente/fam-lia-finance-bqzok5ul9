import { useInvestments } from '@/hooks/use-investments'
import { useDebts } from '@/hooks/use-debts'

export function usePatrimony(familyId: string | undefined) {
  const { totalCurrent, loading: invLoading, error: invError } = useInvestments(familyId)
  const { totalRemaining, loading: debtLoading, error: debtError } = useDebts(familyId)

  const totalAssets = totalCurrent
  const totalLiabilities = totalRemaining
  const netWorth = totalAssets - totalLiabilities
  const loading = invLoading || debtLoading
  const error = invError || debtError

  return { totalAssets, totalLiabilities, netWorth, loading, error }
}
