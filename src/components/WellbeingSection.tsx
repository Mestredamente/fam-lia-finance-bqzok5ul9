import { useNavigate } from 'react-router-dom'
import { BookHeart, Trophy, ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useEmotionalJournal } from '@/hooks/use-emotional-journal'
import { useChallenges } from '@/hooks/use-challenges'
import { getEmotionMeta } from '@/lib/wellness-constants'
import { formatBRL } from '@/lib/utils'

export function WellbeingSection({ familyId, memberId }: { familyId: string; memberId: string }) {
  const navigate = useNavigate()
  const now = new Date()
  const { summary, loading: journalLoading } = useEmotionalJournal(
    memberId,
    now.getMonth(),
    now.getFullYear(),
  )
  const { summary: challengeSummary, loading: challengesLoading } = useChallenges(
    memberId,
    familyId,
  )

  const loading = journalLoading || challengesLoading
  const hasData = summary.entryCount > 0 || challengeSummary.activeChallenges.length > 0

  if (loading) return <Skeleton className="h-40 rounded-2xl" />

  if (!hasData) {
    return (
      <section className="space-y-3">
        <h3 className="text-base font-bold text-gray-900">Bem-estar Financeiro</h3>
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-[#166534]" />
            </div>
            <p className="text-sm text-gray-500">
              Comece seu diário emocional e ative um desafio para desenvolver hábitos financeiros
              saudáveis
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                size="sm"
                className="bg-[#166534] hover:bg-[#15803D]"
                onClick={() => navigate('/diario-emocional')}
              >
                <BookHeart className="h-4 w-4 mr-1.5" /> Abrir diário
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/desafios')}>
                <Trophy className="h-4 w-4 mr-1.5" /> Ver desafios
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  const topEmotion = summary.topEmotion ? getEmotionMeta(summary.topEmotion) : null
  const badge = challengeSummary.currentBadge

  return (
    <section className="space-y-3">
      <h3 className="text-base font-bold text-gray-900">Bem-estar Financeiro</h3>
      <Card className="border-none shadow-subtle rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Emoção do mês</span>
              {topEmotion ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{topEmotion.emoji}</span>
                  <span className="text-sm font-bold text-gray-900">{topEmotion.label}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
              <span className="text-xs text-gray-500">{summary.entryCount} entradas no diário</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Gasto emocional</span>
              <span className="text-lg font-extrabold text-red-600">
                {formatBRL(summary.totalSpent)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Desafios ativos</span>
              <span className="text-lg font-extrabold text-[#166534]">
                {challengeSummary.activeChallenges.length}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Pontos / Badge</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold text-[#166534]">
                  {challengeSummary.totalPoints}
                </span>
                <span className="text-xl">{badge.emoji}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-[#166534] text-[#166534] hover:bg-emerald-50"
              onClick={() => navigate('/diario-emocional')}
            >
              Ver análise completa <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/desafios')}
            >
              Ver desafios <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
