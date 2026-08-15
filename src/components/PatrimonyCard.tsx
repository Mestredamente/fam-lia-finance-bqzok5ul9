import { useNavigate } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePatrimony } from '@/hooks/use-patrimony'
import { formatBRL } from '@/lib/utils'

interface Props {
  familyId: string
}

export function PatrimonyCard({ familyId }: Props) {
  const navigate = useNavigate()
  const { netWorth, loading: patrimonyLoading } = usePatrimony(familyId)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate('/patrimonio')}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/patrimonio')}
      className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Landmark className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Patrimônio</h3>
        </div>
        {patrimonyLoading ? (
          <Skeleton className="h-6 w-full mt-auto" />
        ) : (
          <div className="flex flex-col gap-1 mt-auto">
            <p className="text-xs text-gray-500">Patrimônio líquido</p>
            <p className="text-lg font-bold text-gray-900">{formatBRL(netWorth)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
