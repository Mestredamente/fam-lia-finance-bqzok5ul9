import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, formatDatePtBR } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface FixedBillsSectionProps {
  fixedBills: TransactionRecord[]
  totalPaid: number
  loading: boolean
  onAddFixed: () => void
}

export function FixedBillsSection({
  fixedBills,
  totalPaid,
  loading,
  onAddFixed,
}: FixedBillsSectionProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Contas fixas deste mês</h2>
        <Skeleton className="h-32 rounded-2xl" />
      </section>
    )
  }

  if (fixedBills.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Contas fixas deste mês</h2>
        <Card className="border-dashed border-gray-200 shadow-subtle rounded-2xl bg-white">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma conta fixa neste mês</p>
            <Button
              size="sm"
              onClick={onAddFixed}
              className="bg-[#166534] hover:bg-[#15803D] text-white"
            >
              Adicionar conta fixa
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const total = fixedBills.length
  const paidPercent = (totalPaid / total) * 100
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getStatus = (dateStr: string) => {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    if (d < today) return { label: 'Pago', className: 'bg-emerald-100 text-[#166534]' }
    if (d.getTime() === today.getTime())
      return { label: 'Vence hoje', className: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Contas fixas deste mês</h2>
      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>
              {totalPaid} de {total} contas pagas
            </span>
            <span>{Math.round(paidPercent)}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22C55E] transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
      </Card>
      <div className="space-y-2">
        {fixedBills.map((bill) => {
          const cat = bill.expand?.category_id
          const Icon = getCategoryIcon(cat?.icon || 'plus-circle')
          const status = getStatus(bill.transaction_date)
          return (
            <Card
              key={bill.id}
              className="border border-gray-100 shadow-subtle rounded-2xl bg-white"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (cat?.color || '#999') + '20' }}
                >
                  <Icon className="h-5 w-5" style={{ color: cat?.color || '#999' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{bill.description}</p>
                  <p className="text-xs text-gray-500">{formatDatePtBR(bill.transaction_date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
                    {formatBRL(bill.amount)}
                  </span>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
