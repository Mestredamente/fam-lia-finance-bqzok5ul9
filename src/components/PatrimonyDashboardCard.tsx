import { useNavigate } from 'react-router-dom'
import { usePatrimony } from '@/hooks/use-patrimony'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL, cn } from '@/lib/utils'

interface Props {
  familyId: string
}

export function PatrimonyDashboardCard({ familyId }: Props) {
  const navigate = useNavigate()
  const { totalAssets, totalLiabilities, netWorth, loading } = usePatrimony(familyId)

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Patrimônio líquido</h2>
        <Skeleton className="h-36 rounded-2xl" />
      </section>
    )
  }

  const total = totalAssets + totalLiabilities
  const assetsPercent = total > 0 ? (totalAssets / total) * 100 : 0

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Patrimônio líquido</h2>
      <Card
        onClick={() => navigate('/patrimonio')}
        className="border border-gray-100 shadow-subtle rounded-2xl bg-white cursor-pointer hover:shadow-elevation transition-all"
      >
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 block">Ativos</span>
              <span className="text-base font-bold text-[#22C55E]">{formatBRL(totalAssets)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">Passivos</span>
              <span className="text-base font-bold text-red-600">
                {formatBRL(totalLiabilities)}
              </span>
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 block">Patrimônio líquido</span>
            <span
              className={cn(
                'text-2xl font-extrabold transition-all duration-300',
                netWorth >= 0 ? 'text-[#166534]' : 'text-red-600',
              )}
            >
              {formatBRL(netWorth)}
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
            <div
              className="h-full bg-[#22C55E] transition-all duration-500"
              style={{ width: `${assetsPercent}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${100 - assetsPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
