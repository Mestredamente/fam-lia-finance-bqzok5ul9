import { useState, useMemo } from 'react'
import { Target, Plus, Pencil, Trash2, Pause, Play, PlusCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Confetti } from '@/components/Confetti'
import { SavingsGoalFormSheet } from '@/components/SavingsGoalFormSheet'
import { SavingsGoalAddValueSheet } from '@/components/SavingsGoalAddValueSheet'
import { useAuth } from '@/hooks/use-auth'
import { useSavingsGoals } from '@/hooks/use-savings-goals'
import { deleteSavingsGoal, updateSavingsGoal } from '@/services/savings-goals'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { SavingsGoal } from '@/types/finance'

const MONTHS_PT_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

function formatDeadline(
  deadline: string | null | undefined,
): { label: string; months: number } | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  const label = `${MONTHS_PT_SHORT[d.getMonth()]} ${d.getFullYear()}`
  const now = new Date()
  const months = monthsBetween(now, d)
  return { label, months }
}

export default function SavingsGoals() {
  const { family } = useAuth()
  const { goals, loading, error, refetch } = useSavingsGoals(family?.id)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null)
  const [addValueGoal, setAddValueGoal] = useState<SavingsGoal | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const totals = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active')
    const saved = active.reduce((s, g) => s + (g.current_amount || 0), 0)
    const target = active.reduce((s, g) => s + (g.target_amount || 0), 0)
    return { saved, target }
  }, [goals])

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = (g: SavingsGoal) => {
    setEditing(g)
    setShowForm(true)
  }

  const togglePause = async (g: SavingsGoal) => {
    try {
      const next = g.status === 'paused' ? 'active' : 'paused'
      await updateSavingsGoal(g.id, { status: next })
      toast({ title: next === 'paused' ? 'Meta pausada' : 'Meta reativada' })
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar meta' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteSavingsGoal(deleting.id)
      toast({ title: 'Meta excluída' })
      setDeleting(null)
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir meta' })
    }
  }

  const handleAddValueSaved = (completed: boolean) => {
    refetch()
    if (completed) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Confetti show={showConfetti} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#166534]">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
              Metas de Economia
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Acompanhe o progresso das suas metas de poupança.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-[#166534] hover:bg-[#15803D]">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova meta</span>
        </Button>
      </div>

      {goals.length > 0 && (
        <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Total poupado</span>
              <span className="text-lg font-extrabold text-[#22C55E]">
                {formatBRL(totals.saved)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Meta total</span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-foreground">
                {formatBRL(totals.target)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-danger">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : goals.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <CardContent className="p-4">
            <EmptyState
              icon={<Target className="h-16 w-16" />}
              title="Crie sua primeira meta de economia"
              description="Defina objetivos como reserva de emergência, viagem, troca de carro e acompanhe seu progresso."
              actionLabel="Criar meta"
              onAction={openCreate}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onAddValue={() => setAddValueGoal(g)}
              onEdit={() => openEdit(g)}
              onTogglePause={() => togglePause(g)}
              onDelete={() => setDeleting(g)}
            />
          ))}
        </div>
      )}

      <SavingsGoalFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        memberId={family.created_by}
        editing={editing}
        onSaved={refetch}
      />

      <SavingsGoalAddValueSheet
        open={!!addValueGoal}
        onOpenChange={(o) => !o && setAddValueGoal(null)}
        goal={addValueGoal}
        onSaved={handleAddValueSaved}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta "{deleting?.title}"? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface GoalCardProps {
  goal: SavingsGoal
  onAddValue: () => void
  onEdit: () => void
  onTogglePause: () => void
  onDelete: () => void
}

function GoalCard({ goal, onAddValue, onEdit, onTogglePause, onDelete }: GoalCardProps) {
  const target = goal.target_amount || 0
  const current = goal.current_amount || 0
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const faltam = Math.max(target - current, 0)
  const isCompleted = goal.status === 'completed' || pct >= 100
  const isPaused = goal.status === 'paused'

  const deadlineInfo = formatDeadline(goal.deadline)
  const isLate = !isCompleted && deadlineInfo && deadlineInfo.months < 0 && current < target

  const valorPorMes = deadlineInfo && deadlineInfo.months > 0 ? faltam / deadlineInfo.months : null

  const color = goal.color || '#10b981'
  const effectiveColor = isCompleted ? '#22C55E' : isPaused ? '#9ca3af' : color

  return (
    <Card
      role="listitem"
      className={cn(
        'border border-gray-100 dark:border-gray-700 shadow-subtle rounded-2xl bg-white dark:bg-card transition-all',
        isPaused && 'opacity-70',
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0" aria-hidden="true">
              {goal.icon || '🎯'}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
                {goal.title}
              </h3>
              {goal.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                  {goal.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isCompleted ? (
              <Badge className="bg-green-100 text-green-700 text-[10px]">Concluída 🎉</Badge>
            ) : isLate ? (
              <Badge className="bg-red-100 text-red-700 text-[10px]">Atrasada</Badge>
            ) : isPaused ? (
              <Badge className="bg-gray-100 text-gray-500 text-[10px]">Pausada</Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Ativa</Badge>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-gray-900 dark:text-foreground">
              {formatBRL(current)} / {formatBRL(target)}
            </span>
            <span className="font-medium text-gray-500 dark:text-gray-400">{Math.round(pct)}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: effectiveColor }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {!isCompleted && faltam > 0 && (
            <span>
              Faltam{' '}
              <strong className="text-gray-700 dark:text-gray-200">{formatBRL(faltam)}</strong>
            </span>
          )}
          {deadlineInfo && (
            <span>
              Prazo: {deadlineInfo.label}
              {deadlineInfo.months > 0 && !isCompleted
                ? ` (${deadlineInfo.months} ${deadlineInfo.months === 1 ? 'mês' : 'meses'})`
                : ''}
            </span>
          )}
          {valorPorMes !== null && !isCompleted && (
            <span>
              <strong className="text-gray-700 dark:text-gray-200">
                {formatBRL(valorPorMes)}/mês
              </strong>{' '}
              para atingir
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            onClick={onAddValue}
            disabled={isCompleted}
            className="h-8 text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Adicionar valor
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
            aria-label="Editar meta"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onTogglePause}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
            aria-label={isPaused ? 'Reativar meta' : 'Pausar meta'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-danger/5"
            aria-label="Excluir meta"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
