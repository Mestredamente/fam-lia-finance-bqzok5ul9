import { useState } from 'react'
import { Pencil, Trash2, Play, CheckCircle2, XCircle } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/CurrencyInput'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { TaskCompleteDialog } from '@/components/TaskCompleteDialog'
import { useShoppingList } from '@/hooks/use-shopping-list'
import {
  taskCategoryMeta,
  taskPriorityMeta,
  recurrenceLabels,
  getDaysRemaining,
} from '@/lib/household-icons'
import { formatBRL, formatDatePtBR } from '@/lib/utils'
import type { HouseholdTaskRecord, CompleteTaskOptions } from '@/types/household-tasks'
import type { MemberRecord } from '@/types/finance'

interface Props {
  task: HouseholdTaskRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isOwner: boolean
  members: MemberRecord[]
  familyId: string
  onEdit: () => void
  onStart: () => void
  onCancel: () => void
  onDelete: () => void
  onComplete: (options: CompleteTaskOptions) => Promise<void>
}

export function HouseholdTaskDetailSheet({
  task,
  open,
  onOpenChange,
  isOwner,
  members,
  familyId,
  onEdit,
  onStart,
  onCancel,
  onDelete,
  onComplete,
}: Props) {
  const [showComplete, setShowComplete] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { items, toggleItem, updateActualPrice, totalEstimated, totalActual } = useShoppingList(
    open ? task?.id : undefined,
    task?.shopping_items || [],
  )

  if (!task) return null
  const catMeta = taskCategoryMeta[task.category]
  const CatIcon = catMeta.icon
  const priMeta = taskPriorityMeta[task.priority]
  const days = getDaysRemaining(task.due_date)
  const isActive = task.status === 'pending' || task.status === 'in_progress'
  const assignee = task.expand?.assigned_to

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-center">{task.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="gap-1">
                <CatIcon className="h-3 w-3" style={{ color: catMeta.color }} />
                {catMeta.label}
              </Badge>
              <Badge className={`${priMeta.bg} ${priMeta.color} border-0`}>{priMeta.label}</Badge>
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 text-center">{task.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {task.estimated_cost != null && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500 block">Custo estimado</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatBRL(task.estimated_cost)}
                  </span>
                </div>
              )}
              {task.actual_cost != null && task.status === 'completed' && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500 block">Custo real</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatBRL(task.actual_cost)}
                  </span>
                </div>
              )}
              {task.due_date && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500 block">Prazo</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDatePtBR(task.due_date)}
                  </span>
                  {days && <span className={`text-xs ${days.color} block`}>{days.text}</span>}
                </div>
              )}
              {assignee && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500 block">Responsável</span>
                  <span className="text-sm font-medium text-gray-900">{assignee.display_name}</span>
                </div>
              )}
            </div>
            {task.is_recurring && task.recurrence_pattern && (
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <span className="text-xs text-blue-600">
                  Recorrência: {recurrenceLabels[task.recurrence_pattern]}
                </span>
              </div>
            )}
            {items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Lista de compras</h4>
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Checkbox checked={item.checked} onCheckedChange={() => toggleItem(item.id)} />
                    <span
                      className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}
                    >
                      {item.name} ({item.quantity}x)
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatBRL(item.estimated_price * item.quantity)}
                    </span>
                    {item.checked && (
                      <div className="w-24">
                        <CurrencyInput
                          value={item.actual_price || 0}
                          onChange={(v) => updateActualPrice(item.id, v)}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between text-xs font-semibold pt-1">
                  <span>Total estimado: {formatBRL(totalEstimated)}</span>
                  {totalActual > 0 && <span>Total real: {formatBRL(totalActual)}</span>}
                </div>
              </div>
            )}
            {isActive && (
              <div className="flex gap-2 flex-wrap pt-2">
                {task.status === 'pending' && (
                  <Button variant="outline" className="flex-1" onClick={onStart}>
                    <Play className="h-4 w-4 mr-1" /> Iniciar
                  </Button>
                )}
                <Button
                  className="flex-1 bg-[#166534] hover:bg-[#15803D]"
                  onClick={() => setShowComplete(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                </Button>
                <Button variant="outline" className="flex-1" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setConfirmCancel(true)}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            )}
            {isOwner && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <TaskCompleteDialog
        open={showComplete}
        onOpenChange={setShowComplete}
        task={task}
        familyId={familyId}
        members={members}
        onComplete={onComplete}
      />
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>A tarefa será marcada como cancelada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCancel(false)
                onCancel()
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
