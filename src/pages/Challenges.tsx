import { useState, useEffect } from 'react'
import { Trophy, Plus, Target, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useChallenges } from '@/hooks/use-challenges'
import { ChallengeProgressSheet } from '@/components/ChallengeProgressSheet'
import { ChallengeFormSheet } from '@/components/ChallengeFormSheet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PREDEFINED_CHALLENGES, isChallengeExpired } from '@/lib/wellness-constants'
import { formatBRL, cn } from '@/lib/utils'
import { updateChallenge } from '@/services/challenges'
import { toast } from '@/hooks/use-toast'
import type { ChallengeRecord } from '@/types/finance'

const statusMeta: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700' },
  abandoned: { label: 'Abandonado', color: 'bg-gray-100 text-gray-500' },
}

export default function Challenges() {
  const { member, family } = useAuth()
  const { challenges, summary, loading, addProgress, createChallenge, createCustomChallenge } =
    useChallenges(member?.id, family?.id)
  const [progressOpen, setProgressOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<ChallengeRecord | null>(null)

  useEffect(() => {
    challenges.forEach((c) => {
      if (c.status === 'active' && isChallengeExpired(c)) {
        updateChallenge(c.id, { status: 'failed' }).catch(() => {})
      }
    })
  }, [challenges])

  const handleCreatePreset = async (preset: any) => {
    try {
      await createChallenge(preset)
      toast({ title: 'Desafio criado!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao criar desafio' })
    }
  }

  const handleCreateCustom = async (data: {
    title: string
    description: string
    targetValue: number | null
    durationDays: number
  }) => {
    try {
      await createCustomChallenge(data)
      toast({ title: 'Desafio criado!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao criar desafio' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  const active = challenges.filter((c) => c.status === 'active')
  const past = challenges.filter((c) => c.status !== 'active')
  const badge = summary.currentBadge

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Desafios</h1>
        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          className="bg-[#166534] hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4 mr-1" /> Criar
        </Button>
      </div>

      <Card className="rounded-2xl bg-gradient-to-br from-[#166534] to-[#22C55E] text-white border-0">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <p className="text-2xl font-bold">{summary.totalPoints} pts</p>
            <p className="text-sm text-white/80">{badge?.label || 'Sem medalha'}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-2">Modelos rápidos</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PREDEFINED_CHALLENGES.map((p: any, i: number) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => handleCreatePreset(p)}
            >
              {p.title}
            </Button>
          ))}
        </div>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Ativos</h2>
          {active.map((c) => {
            const pct = c.target_value
              ? Math.min(((c.current_value || 0) / c.target_value) * 100, 100)
              : 0
            const isNumeric = c.target_value && c.target_value > 0
            return (
              <Card key={c.id} className="rounded-2xl border-gray-100 shadow-subtle">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500 truncate">{c.description}</p>
                    </div>
                    <Badge className={cn('text-xs shrink-0', statusMeta[c.status]?.color)}>
                      {statusMeta[c.status]?.label}
                    </Badge>
                  </div>
                  {isNumeric && (
                    <>
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatBRL(c.current_value || 0)}</span>
                        <span>{formatBRL(c.target_value || 0)}</span>
                      </div>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelected(c)
                      setProgressOpen(true)
                    }}
                  >
                    <Target className="h-4 w-4 mr-1" /> Registrar progresso
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700">Histórico</h2>
          {past.map((c) => (
            <Card key={c.id} className="rounded-2xl border-gray-100">
              <CardContent className="p-3 flex items-center gap-3">
                {c.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  {c.points ? <p className="text-xs text-gray-500">+{c.points} pts</p> : null}
                </div>
                <Badge className={cn('text-xs shrink-0', statusMeta[c.status]?.color)}>
                  {statusMeta[c.status]?.label}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {challenges.length === 0 && (
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-8 text-center">
            <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Crie seu primeiro desafio!</p>
          </CardContent>
        </Card>
      )}

      <ChallengeProgressSheet
        open={progressOpen}
        onOpenChange={setProgressOpen}
        challenge={selected}
        onSubmit={(inc) => addProgress(selected!.id, inc)}
      />
      <ChallengeFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateCustom}
      />
    </div>
  )
}
