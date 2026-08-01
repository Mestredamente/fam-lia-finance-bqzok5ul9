import { useState, useEffect } from 'react'
import { Loader2, Share2, Trophy, Target, Calendar, Award, UserPlus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getChallengeById, duplicateChallenge } from '@/services/challenges'
import { useAuth } from '@/hooks/use-auth'
import { formatBRL } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { ChallengeRecord } from '@/types/finance'

interface Props {
  challengeId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onJoined?: () => void
}

export function ChallengeShareSheet({ challengeId, open, onOpenChange, onJoined }: Props) {
  const { member, family } = useAuth()
  const [challenge, setChallenge] = useState<ChallengeRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!challengeId || !open) {
      setChallenge(null)
      return
    }
    setLoading(true)
    getChallengeById(challengeId)
      .then(setChallenge)
      .catch(() => {
        toast({ variant: 'destructive', title: 'Desafio não encontrado' })
        onOpenChange(false)
      })
      .finally(() => setLoading(false))
  }, [challengeId, open])

  const handleJoin = async () => {
    if (!challenge || !member || !family) return
    setJoining(true)
    try {
      await duplicateChallenge(challenge.id, member.id, family.id)
      toast({ title: 'Desafio adicionado!', description: 'O desafio foi copiado para sua conta.' })
      onJoined?.()
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível entrar no desafio.',
      })
    } finally {
      setJoining(false)
    }
  }

  const handleShare = async () => {
    if (!challenge) return
    const shareUrl = `${window.location.origin}/challenges?id=${challenge.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: challenge.title,
          text: `Participe: ${challenge.title}! ${challenge.description}`,
          url: shareUrl,
        })
      } catch {
        /* intentionally ignored */
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast({ title: 'Link copiado!' })
    }
  }

  const progress = challenge?.target_value
    ? Math.min(((challenge.current_value || 0) / challenge.target_value) * 100, 100)
    : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Desafio Compartilhado
          </SheetTitle>
          <SheetDescription>Veja os detalhes e participe</SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : challenge ? (
          <div className="space-y-4 mt-4 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{challenge.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Target className="h-3.5 w-3.5" /> Meta
                </div>
                <p className="font-bold text-sm text-gray-900 mt-1">
                  {challenge.target_value ? formatBRL(challenge.target_value) : '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Award className="h-3.5 w-3.5" /> Pontos
                </div>
                <p className="font-bold text-sm text-gray-900 mt-1">{challenge.points || 0} pts</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Progresso</span>
                <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {challenge.target_value && (
                <p className="text-xs text-gray-500">
                  {formatBRL(challenge.current_value || 0)} de {formatBRL(challenge.target_value)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={
                  challenge.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : challenge.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                }
              >
                {challenge.status === 'active'
                  ? 'Ativo'
                  : challenge.status === 'completed'
                    ? 'Concluído'
                    : challenge.status}
              </Badge>
              {challenge.badge_type && challenge.badge_type !== 'none' && (
                <Badge className="bg-amber-100 text-amber-700 capitalize">
                  {challenge.badge_type}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(challenge.start_date).toLocaleDateString('pt-BR')} -{' '}
              {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1.5" /> Compartilhar
              </Button>
              <Button
                className="flex-1 bg-[#166534] hover:bg-[#15803D]"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-1.5" />
                )}{' '}
                Participar
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
