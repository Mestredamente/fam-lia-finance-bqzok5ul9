import { useState, useEffect } from 'react'
import { Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getFixedBillsByFamilyId } from '@/services/debts'
import { formatBRL, formatDatePtBR } from '@/lib/utils'
import type { DebtRecord } from '@/types/finance'

interface Props {
  familyId: string
}

function getNextDueDate(dueDay: number): string {
  const now = new Date()
  const day = Math.min(dueDay, 28)
  let due = new Date(now.getFullYear(), now.getMonth(), day)
  if (due < now) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, day)
  }
  return due.toISOString().split('T')[0]
}

export function FixedBillsPatrimony({ familyId }: Props) {
  const [bills, setBills] = useState<DebtRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFixedBillsByFamilyId(familyId)
      .then(setBills)
      .catch(() => setBills([]))
      .finally(() => setLoading(false))
  }, [familyId])

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Contas Fixas Mensais</h2>
        <Skeleton className="h-24 rounded-2xl" />
      </section>
    )
  }

  if (bills.length === 0) return null

  const totalMonthly = bills.reduce((s, b) => s + b.installment_value, 0)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Contas Fixas Mensais</h2>
      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-gray-700">Total mensal comprometido</span>
          <span className="text-lg font-bold text-amber-700">{formatBRL(totalMonthly)}</span>
        </div>
        <div className="space-y-2">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50"
            >
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{bill.description}</p>
                <p className="text-xs text-gray-500">
                  Próx. vencimento: {formatDatePtBR(getNextDueDate(bill.due_day))}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                {formatBRL(bill.installment_value)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
