import { useState, useEffect, useMemo } from 'react'
import { Plus, Home, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useHouseholdTasks } from '@/hooks/use-household-tasks'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { HouseholdTaskCard } from '@/components/HouseholdTaskCard'
import { HouseholdTaskFormSheet } from '@/components/HouseholdTaskFormSheet'
import { HouseholdTaskDetailSheet } from '@/components/HouseholdTaskDetailSheet'
import { EmptyState } from '@/components/EmptyState'
import { taskStatusMeta } from '@/lib/household-icons'
import { cn, formatBRL, formatDatePtBR } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { getActiveMembersByFamilyId } from '@/services/members'
import type {
  HouseholdTaskRecord,
  HouseholdTaskStatus,
  HouseholdTaskCategory,
  HouseholdTaskFilters,
  CompleteTaskOptions,
} from '@/types/household-tasks'
import type { MemberRecord } from '@/types/finance'

const STATUS_FILTERS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'pending' as const, label: 'Pendentes' },
  { value: 'in_progress' as const, label: 'Em Andamento' },
  { value: 'completed' as const, label: 'Concluídas' },
]

const CATEGORY_FILTERS = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'maintenance' as const, label: 'Manutenção' },
  { value: 'repair' as const, label: 'Reparo' },
  { value: 'purchase' as const, label: 'Compra' },
  { value: 'appointment' as const, label: 'Agendamento' },
  { value: 'deadline' as const, label: 'Prazo' },
  { value: 'subscription_review' as const, label: 'Assinaturas' },
  { value: 'planning' as const, label: 'Planejamento' },
]

export default function Casa() {
  const { family, member, user } = useAuth()
  const isMobile = useIsMobile()
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | HouseholdTaskStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | HouseholdTaskCategory>('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<HouseholdTaskRecord | null>(null)
  const [selectedTask, setSelectedTask] = useState<HouseholdTaskRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [collapsedCompleted, setCollapsedCompleted] = useState(true)

  const filters = useMemo<HouseholdTaskFilters>(() => {
    const f: HouseholdTaskFilters = {}
    if (statusFilter !== 'all') f.status = statusFilter
    if (categoryFilter !== 'all') f.category = categoryFilter
    if (memberFilter !== 'all') f.assigned_to = memberFilter
    return f
  }, [statusFilter, categoryFilter, memberFilter])

  const { tasks, loading, error, refetch, updateTask, completeTask, cancelTask, deleteTask } =
    useHouseholdTasks(family?.id, filters)

  useEffect(() => {
    if (family)
      getActiveMembersByFamilyId(family.id)
        .then(setMembers)
        .catch(() => {})
  }, [family?.id])

  const visibleTasks =
    statusFilter === 'all' ? tasks.filter((t) => t.status !== 'cancelled') : tasks
  const pendingTasks = visibleTasks.filter((t) => t.status === 'pending')
  const inProgressTasks = visibleTasks.filter((t) => t.status === 'in_progress')
  const completedTasks = visibleTasks.filter((t) => t.status === 'completed')

  const handleTaskClick = (t: HouseholdTaskRecord) => {
    setSelectedTask(t)
    setShowDetail(true)
  }
  const openForm = () => {
    setEditingTask(null)
    setShowForm(true)
  }
  const openEdit = () => {
    if (!selectedTask) return
    setEditingTask(selectedTask)
    setShowDetail(false)
    setShowForm(true)
  }
  const handleStart = async () => {
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, { status: 'in_progress' })
      toast({ title: 'Tarefa iniciada' })
      setShowDetail(false)
      setSelectedTask(null)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao iniciar tarefa' })
    }
  }
  const handleCancelTask = async () => {
    if (!selectedTask) return
    try {
      await cancelTask(selectedTask.id)
      toast({ title: 'Tarefa cancelada' })
      setShowDetail(false)
      setSelectedTask(null)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao cancelar tarefa' })
    }
  }
  const handleDelete = async () => {
    if (!selectedTask) return
    try {
      await deleteTask(selectedTask.id)
      toast({ title: 'Tarefa excluída' })
      setShowDetail(false)
      setSelectedTask(null)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir tarefa' })
    }
  }
  const handleComplete = async (options: CompleteTaskOptions) => {
    if (!selectedTask || !family) return
    try {
      const result = await completeTask(selectedTask.id, family.id, options)
      if (result.transactionCreated && result.transactionAmount) {
        toast({
          title: `Tarefa concluída! Transação de ${formatBRL(result.transactionAmount)} criada.`,
        })
      } else {
        toast({ title: 'Tarefa concluída!' })
      }
      if (result.nextOccurrenceDate) {
        toast({
          title: `Próxima ocorrência criada para ${formatDatePtBR(result.nextOccurrenceDate)}`,
        })
      }
      setShowDetail(false)
      setSelectedTask(null)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao concluir tarefa' })
      throw new Error()
    }
  }

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  const isOwner = selectedTask?.created_by === member?.id || family?.created_by === user?.id

  const renderGroup = (
    status: HouseholdTaskStatus,
    groupTasks: HouseholdTaskRecord[],
    collapsed = false,
  ) => {
    const meta = taskStatusMeta[status]
    if (!isMobile) {
      return (
        <div key={status} className={cn('rounded-2xl p-3 min-h-[200px]', meta.bg)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn('font-bold text-sm', meta.color)}>{meta.label}</h3>
            <Badge variant="outline" className="text-xs">
              {groupTasks.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {groupTasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma tarefa</p>
            ) : (
              groupTasks.map((t) => (
                <HouseholdTaskCard key={t.id} task={t} onClick={() => handleTaskClick(t)} />
              ))
            )}
          </div>
        </div>
      )
    }
    if (groupTasks.length === 0) return null
    if (collapsed) {
      return (
        <Collapsible
          key={status}
          open={!collapsedCompleted}
          onOpenChange={(open) => setCollapsedCompleted(!open)}
        >
          <CollapsibleTrigger className="w-full">
            <div
              className={cn(
                'px-3 py-2 rounded-lg flex items-center justify-between',
                meta.headerBg,
              )}
            >
              <h3 className={cn('font-bold text-sm', meta.color)}>
                {meta.label} ({groupTasks.length})
              </h3>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', !collapsedCompleted && 'rotate-180')}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {groupTasks.map((t) => (
              <HouseholdTaskCard key={t.id} task={t} onClick={() => handleTaskClick(t)} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )
    }
    return (
      <section key={status} className="space-y-2">
        <div className={cn('px-3 py-2 rounded-lg', meta.headerBg)}>
          <h3 className={cn('font-bold text-sm', meta.color)}>
            {meta.label} ({groupTasks.length})
          </h3>
        </div>
        {groupTasks.map((t) => (
          <HouseholdTaskCard key={t.id} task={t} onClick={() => handleTaskClick(t)} />
        ))}
      </section>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">Planejador</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tarefas e compromissos financeiros da família
          </p>
        </div>
        <Button
          onClick={openForm}
          className="h-9 px-3 py-2 rounded-lg text-sm bg-[#166534] hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'secondary'}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground',
                statusFilter === f.value && 'bg-[#166534] hover:bg-[#15803D] text-white',
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={categoryFilter === f.value ? 'default' : 'secondary'}
              onClick={() => setCategoryFilter(f.value)}
              className={cn(
                'h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground',
                categoryFilter === f.value && 'bg-[#166534] hover:bg-[#15803D] text-white',
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          <Button
            variant={memberFilter === 'all' ? 'default' : 'secondary'}
            onClick={() => setMemberFilter('all')}
            className={cn(
              'h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground',
              memberFilter === 'all' && 'bg-[#166534] hover:bg-[#15803D] text-white',
            )}
          >
            Todos
          </Button>
          {members.map((m) => (
            <Button
              key={m.id}
              variant={memberFilter === m.id ? 'default' : 'secondary'}
              onClick={() => setMemberFilter(m.id)}
              className={cn(
                'h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground',
                memberFilter === m.id && 'bg-[#166534] hover:bg-[#15803D] text-white',
              )}
            >
              {m.display_name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
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
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={<Home className="h-12 w-12 text-gray-400" />}
          title="Nenhuma tarefa cadastrada"
          description="Adicione compromissos financeiros, reparos, compras e prazos da sua família"
          actionLabel="Adicionar primeira tarefa"
          onAction={openForm}
        />
      ) : isMobile ? (
        <div className="space-y-6">
          {renderGroup('pending', pendingTasks)}
          {renderGroup('in_progress', inProgressTasks)}
          {renderGroup('completed', completedTasks, true)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {renderGroup('pending', pendingTasks)}
          {renderGroup('in_progress', inProgressTasks)}
          {renderGroup('completed', completedTasks)}
        </div>
      )}

      <button
        onClick={openForm}
        aria-label="Adicionar tarefa"
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      <HouseholdTaskFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        memberId={member?.id || ''}
        members={members}
        editingTask={editingTask}
        onSaved={refetch}
      />
      <HouseholdTaskDetailSheet
        task={selectedTask}
        open={showDetail}
        onOpenChange={setShowDetail}
        isOwner={isOwner}
        members={members}
        familyId={family.id}
        onEdit={openEdit}
        onStart={handleStart}
        onCancel={handleCancelTask}
        onDelete={handleDelete}
        onComplete={handleComplete}
      />
    </div>
  )
}
