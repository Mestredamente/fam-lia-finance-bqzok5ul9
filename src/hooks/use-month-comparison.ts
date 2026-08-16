import { useMemo } from 'react'
import { useMonthlyCharts } from '@/hooks/use-monthly-charts'
import { getMonthName } from '@/lib/utils'

export interface PrevMonthData {
  income: number
  expenses: number
  saldo: number
  label: string
}

export interface MonthComparisonResult {
  prevMonth: PrevMonthData | null
  hasComparison: boolean
  loading: boolean
}

/**
 * Reutiliza os 12 meses de transações já buscados por `useMonthlyCharts`
 * (sem nova chamada ao banco) e extrai o mês anterior ao atual para
 * comparações mês-a-mês no dashboard.
 *
 * O mês anterior é o penúltimo elemento de `monthlyComparison` (o último é o
 * mês corrente). `hasComparison` é false quando o mês anterior está vazio
 * (primeiro mês de uso).
 */
export function useMonthComparison(
  familyId: string | undefined,
  year: number,
  month: number,
): MonthComparisonResult {
  const { monthlyComparison, loading } = useMonthlyCharts(familyId, year, month)

  return useMemo<MonthComparisonResult>(() => {
    // monthlyComparison tem 12 entradas: [m-11 ... m]. O mês anterior é o
    // penúltimo (índice 10), o atual é o último (índice 11).
    const prev = monthlyComparison[monthlyComparison.length - 2]
    if (!prev) {
      return { prevMonth: null, hasComparison: false, loading }
    }
    const hasData = prev.income !== 0 || prev.expenses !== 0
    // O mês anterior ao atual (month-1). Usamos Date para lidar com virada de
    // ano (janeiro -> dezembro do ano anterior).
    const prevDate = new Date(year, month - 1, 1)
    return {
      prevMonth: {
        income: prev.income,
        expenses: prev.expenses,
        saldo: prev.income - prev.expenses,
        label: getMonthName(prevDate.getMonth()).toLowerCase(),
      },
      hasComparison: hasData,
      loading,
    }
  }, [monthlyComparison, loading, year, month])
}
