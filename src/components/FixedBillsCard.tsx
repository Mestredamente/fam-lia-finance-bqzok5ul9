import { useNavigate } from 'react-router-dom'
import { Receipt, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useFixedBills } from '@/hooks/use-fixed-bills'

interface Props {
  familyId: string
  year: number
  month: number
  onAddFixed: () => void
}

export function FixedBillsCard({ familyId, year, month, onAddFixed }: Props) {
  const navigate = useNavigate()
  const { fixedBills, totalPaid, loading: billsLoading } = useFixedBills(familyId, year, month)

  const totalBills = fixedBills.length
  const paidPct = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate('/casa')}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/casa')}
      className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Contas Fixas</h3>
        </div>
        {billsLoading ? (
          <Skeleton className="h-6 w-full" />
        ) : totalBills === 0 ? (
          <div className="flex flex-col gap-2 mt-auto">
            <p className="text-xs text-gray-500">Nenhuma conta fixa cadastrada</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8"
              onClick={(e) => {
                e.stopPropagation()
                onAddFixed()
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-auto">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{totalPaid}</span> de{' '}
              <span className="font-bold text-gray-900">{totalBills}</span> contas pagas
            </p>
            <Progress value={paidPct} className="h-2" />
            <p className="text-xs text-gray-400">{paidPct}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
