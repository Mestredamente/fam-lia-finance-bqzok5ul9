import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Brain,
  ChevronDown,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAIInsights } from '@/hooks/use-ai-insights'
import { cn } from '@/lib/utils'
import type { AIInsight } from '@/types/finance'

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  alerta: AlertTriangle,
  oportunidade: Lightbulb,
  educacao: BookOpen,
  comportamento: Brain,
}

const PRIORITY_STYLES: Record<string, string> = {
  alta: 'bg-red-50 border-red-200',
  media: 'bg-yellow-50 border-yellow-200',
  baixa: 'bg-green-50 border-green-200',
}

const TYPE_LABELS: Record<string, string> = {
  alerta: 'Alerta',
  oportunidade: 'Oportunidade',
  educacao: 'Educação',
  comportamento: 'Comportamento',
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ICON_MAP[insight.tipo] || Bot

  return (
    <Card
      className={cn(
        'w-full sm:min-w-[280px] snap-start cursor-pointer transition-all border',
        PRIORITY_STYLES[insight.prioridade] || 'bg-gray-50 border-gray-200',
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="h-4 w-4 text-gray-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 leading-tight">{insight.titulo}</h4>
            <Badge variant="secondary" className="text-xs mt-1 h-5">
              {TYPE_LABELS[insight.tipo] || insight.tipo}
            </Badge>
          </div>
        </div>
        <p className={cn('text-xs text-gray-600', !expanded && 'line-clamp-2')}>
          {insight.descricao}
        </p>
        {expanded && insight.acao_recomendada && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-gray-200/50 animate-fade-in">
            <ArrowRight className="h-3 w-3 text-[#166534] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 font-medium">{insight.acao_recomendada}</p>
          </div>
        )}
        <div className="flex items-center gap-1 pt-0.5">
          <span className="text-xs text-gray-400">{expanded ? 'Ver menos' : 'Ver mais'}</span>
          <ChevronDown
            className={cn('h-3 w-3 text-gray-400 transition-transform', expanded && 'rotate-180')}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function InsightsSection({ familyId, memberId }: { familyId: string; memberId: string }) {
  const navigate = useNavigate()
  const { insights, loading } = useAIInsights(familyId, memberId)

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[#166534]" />
          <h3 className="text-base font-bold text-gray-900">Insights da consultora</h3>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-[260px] rounded-2xl shrink-0" />
          ))}
        </div>
      </section>
    )
  }

  if (!insights || insights.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#166534] flex items-center justify-center text-white">
          <Bot className="h-4 w-4" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Insights da consultora</h3>
      </div>
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {insights.slice(0, 5).map((insight, i) => (
          <InsightCard key={i} insight={insight} />
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/consultora')}
        className="w-full sm:w-auto border-[#166534] text-[#166534] hover:bg-emerald-50"
      >
        <Bot className="h-4 w-4 mr-1.5" />
        Falar com consultora
      </Button>
    </section>
  )
}
