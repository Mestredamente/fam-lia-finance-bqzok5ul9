import { useState } from 'react'
import { Search, AlertTriangle, Heart, Sparkles, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmotionalAnalysis } from '@/hooks/use-emotional-analysis'
import { useEmotionalJournal } from '@/hooks/use-emotional-journal'
import { getEmotionMeta } from '@/lib/wellness-constants'
import { formatBRL } from '@/lib/utils'
import type { EmotionalAnalysisResult } from '@/types/finance'

export function EmotionalAnalysisView({
  memberId,
  familyId,
}: {
  memberId: string
  familyId: string
}) {
  const { entries } = useEmotionalJournal(memberId)
  const { analysis, loading, error, fetchAnalysis } = useEmotionalAnalysis(memberId, familyId)
  const [fetched, setFetched] = useState(false)

  if (entries.length < 5 && !fetched) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 max-w-xs">
          Registre pelo menos 5 entradas no diário para receber uma análise comportamental
          personalizada
        </p>
        <Badge className="mt-3 bg-gray-100 text-gray-600">{entries.length}/5 entradas</Badge>
      </div>
    )
  }

  if (!fetched && !loading && !analysis) {
    return (
      <div className="flex flex-col items-center py-8">
        <Button
          onClick={() => {
            fetchAnalysis()
            setFetched(true)
          }}
          className="bg-[#166534] hover:bg-[#15803D]"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Gerar minha análise
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <p className="text-sm text-red-500 text-center py-8">{error || 'Erro ao carregar análise'}</p>
    )
  }

  const a = analysis as EmotionalAnalysisResult
  const dominantMeta = a.emocao_dominante?.nome ? getEmotionMeta(a.emocao_dominante.nome) : null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
          <Search className="h-4 w-4 text-[#166534]" /> Padrões identificados
        </h3>
        <div className="space-y-2">
          {a.padroes?.map((p, i) => (
            <Card key={i} className="rounded-xl border-gray-100">
              <CardContent className="p-3 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">{p.titulo}</h4>
                <p className="text-xs text-gray-600">{p.descricao}</p>
                {p.exemplos && p.exemplos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.exemplos.map((ex, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px]">
                        {ex}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {a.gatilho_mais_custoso && (
        <Card className="rounded-xl border-red-200 bg-red-50">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Gatilho mais custoso
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-gray-900">
                {a.gatilho_mais_custoso.nome || '—'}
              </span>
              <Badge className="bg-red-100 text-red-700">
                {formatBRL(a.gatilho_mais_custoso.total_gasto || 0)}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Frequência: {a.gatilho_mais_custoso.frequencia || 0}x
            </p>
          </CardContent>
        </Card>
      )}

      {dominantMeta && a.emocao_dominante && (
        <Card className="rounded-xl border-gray-100">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-3xl">{dominantMeta.emoji}</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">Emoção dominante</h3>
              <p className="text-sm text-gray-700">{dominantMeta.label}</p>
              <p className="text-xs text-gray-500">
                Frequência: {a.emocao_dominante.frequencia || 0}x
              </p>
              {a.emocao_dominante.impacto_financeiro && (
                <p className="text-xs text-gray-500">
                  Impacto: {a.emocao_dominante.impacto_financeiro}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-2">
          <Heart className="h-4 w-4 text-[#166534]" /> Sugestões da IA
        </h3>
        <div className="space-y-2">
          {a.sugestoes?.map((s, i) => (
            <Card key={i} className="rounded-xl border-gray-100">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900">{s.titulo}</h4>
                  {s.tecnica_ccb && (
                    <Badge className="bg-emerald-100 text-[#166534] text-xs shrink-0">
                      {s.tecnica_ccb}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600">{s.descricao}</p>
                <Button size="sm" variant="ghost" className="text-[#166534] text-xs h-7 px-2">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar ao plano
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
