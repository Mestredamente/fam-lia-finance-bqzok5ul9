import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAIInsights } from '@/hooks/use-ai-insights'

interface Props {
  familyId: string
  memberId: string
}

export function AiInsightsCard({ familyId, memberId }: Props) {
  const navigate = useNavigate()
  const { insights, loading: insightsLoading } = useAIInsights(familyId, memberId)
  const insightText = insights[0]?.titulo || insights[0]?.descricao || null

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate('/consultora')}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/consultora')}
      className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Insights</h3>
        </div>
        {insightsLoading ? (
          <Skeleton className="h-6 w-full mt-auto" />
        ) : insightText ? (
          <p className="text-xs text-gray-600 mt-auto line-clamp-3">{insightText}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-auto">Analisando seus padrões...</p>
        )}
      </CardContent>
    </Card>
  )
}
