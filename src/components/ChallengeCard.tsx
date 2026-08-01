import { Share2, Trophy, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatBRL } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { ChallengeRecord } from '@/types/finance'

interface Props {
  challenge: ChallengeRecord
  onProgress?: (c: ChallengeRecord) => void
  showProgressButton?: boolean
}

export function ChallengeCard({ challenge, onProgress, showProgressButton }: Props) {
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/challenges?id=${challenge.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: challenge.title,
          text: `Participe: ${challenge.title}!`,
          url,
        })
      } catch {
        /* intentionally ignored */
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copiado!' })
    }
  }

  const progress = challenge.target_value
    ? Math.min(((challenge.current_value || 0) / challenge.target_value) * 100, 100)
    : 0

  const statusLabel =
    { active: 'Ativo', completed: 'Concluído', failed: 'Falhou', abandoned: 'Abandonado' }[
      challenge.status
    ] || challenge.status

  return (
    <Card className="border border-gray-100 shadow-subtle rounded sm:rounded-2xl bg-white">
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-900">{challenge.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{challenge.description}</p>
          </div>
          <Badge
            className={
              challenge.status === 'active'
                ? 'bg-green-100 text-green-700'
                : challenge.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
            }
          >
            {statusLabel}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {challenge.target_value
                ? `${formatBRL(challenge.current_value || 0)} / ${formatBRL(challenge.target_value)}`
                : `${challenge.current_value || 0} / ${challenge.target_value || 0}`}
            </span>
            <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {challenge.points ? (
              <Badge variant="outline" className="text-xs gap-0.5">
                <Trophy className="h-3 w-3 text-amber-500" />
                {challenge.points} pts
              </Badge>
            ) : null}
            {challenge.badge_type && challenge.badge_type !== 'none' && (
              <Badge className="text-xs capitalize bg-amber-100 text-amber-700">
                {challenge.badge_type}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="h-7 w-7 p-0"
              aria-label="Compartilhar"
            >
              <Share2 className="h-3.5 w-3.5 text-gray-500" />
            </Button>
            {showProgressButton && onProgress && challenge.status === 'active' && (
              <Button
                size="sm"
                onClick={() => onProgress(challenge)}
                className="h-7 text-xs bg-[#166534] hover:bg-[#15803D]"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Registrar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
