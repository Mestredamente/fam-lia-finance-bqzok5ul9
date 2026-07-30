import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/CurrencyInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShoppingListBuilder } from '@/components/ShoppingListBuilder'
import { taskCategoryMeta, taskPriorityMeta } from '@/lib/household-icons'
import { createTask, updateTask } from '@/services/household-tasks'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type {
  HouseholdTaskRecord,
  HouseholdTaskCategory,
  HouseholdTaskPriority,
  ShoppingItem,
} from '@/types/household-tasks'
import type { MemberRecord } from '@/types/finance'

const schema = z
  .object({
    title: z.string().min(3, 'Título muito curto').max(200),
    category: z.enum([
      'maintenance',
      'repair',
      'purchase',
      'appointment',
      'deadline',
      'subscription_review',
      'planning',
      'other',
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
  })
  .refine((d) => d.title.length >= 3, { message: 'Mínimo 3 caracteres', path: ['title'] })

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  memberId: string
  members: MemberRecord[]
  editingTask?: HouseholdTaskRecord | null
  onSaved?: () => void
}

export function HouseholdTaskFormSheet({
  open,
  onOpenChange,
  familyId,
  memberId,
  members,
  editingTask,
  onSaved,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<HouseholdTaskCategory>('maintenance')
  const [priority, setPriority] = useState<HouseholdTaskPriority>('medium')
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [assignee, setAssignee] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState('')
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setTitle(editingTask.title)
        setDescription(editingTask.description || '')
        setCategory(editingTask.category)
        setPriority(editingTask.priority)
        setEstimatedCost(editingTask.estimated_cost || 0)
        setDueDate(editingTask.due_date?.split('T')[0] || '')
        setAssignee(editingTask.assigned_to || '')
        setIsRecurring(editingTask.is_recurring)
        setRecurrencePattern(editingTask.recurrence_pattern || '')
        setShowShoppingList((editingTask.shopping_items || []).length > 0)
        setShoppingItems(editingTask.shopping_items || [])
      } else {
        setTitle('')
        setDescription('')
        setCategory('maintenance')
        setPriority('medium')
        setEstimatedCost(0)
        setDueDate('')
        setAssignee(memberId)
        setIsRecurring(false)
        setRecurrencePattern('')
        setShowShoppingList(false)
        setShoppingItems([])
      }
      setErrors({})
    }
  }, [open, editingTask, memberId])

  const handleSave = async () => {
    const result = schema.safeParse({ title, category, priority })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        errs[i.path[0]] = i.message
      })
      setErrors(errs)
      return
    }
    if (isRecurring && !recurrencePattern) {
      setErrors({ recurrence_pattern: 'Selecione a recorrência' })
      return
    }
    setSaving(true)
    try {
      const data: Partial<HouseholdTaskRecord> = {
        family_id: familyId,
        created_by: memberId,
        assigned_to: assignee || memberId,
        title,
        description,
        category,
        priority,
        estimated_cost: estimatedCost > 0 ? estimatedCost : null,
        due_date: dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : null,
        status: editingTask?.status || 'pending',
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring
          ? (recurrencePattern as HouseholdTaskRecord['recurrence_pattern'])
          : null,
        shopping_items: showShoppingList ? shoppingItems : [],
      }
      if (editingTask) {
        await updateTask(editingTask.id, data)
        toast({ title: 'Tarefa atualizada!' })
      } else {
        await createTask(data)
        toast({ title: 'Tarefa criada com sucesso!' })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Categoria</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {(
                Object.entries(taskCategoryMeta) as [
                  HouseholdTaskCategory,
                  (typeof taskCategoryMeta)[HouseholdTaskCategory],
                ][]
              ).map(([key, meta]) => {
                const Icon = meta.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                      category === key
                        ? 'border-[#22C55E] bg-emerald-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50',
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: meta.color + '20' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </div>
                    <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">
                      {meta.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Prioridade</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {(
                Object.entries(taskPriorityMeta) as [
                  HouseholdTaskPriority,
                  (typeof taskPriorityMeta)[HouseholdTaskPriority],
                ][]
              ).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(key)}
                  className={cn(
                    'py-2 rounded-xl border-2 font-bold text-xs transition-all',
                    priority === key
                      ? `${meta.bg} ${meta.border} ${meta.color}`
                      : 'border-gray-200 bg-white text-gray-500',
                  )}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Custo estimado</Label>
              <CurrencyInput value={estimatedCost} onChange={setEstimatedCost} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Responsável</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Tarefa recorrente</span>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <div>
              <Label className="text-xs font-semibold text-gray-700">Recorrência</Label>
              <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annually">Anual</SelectItem>
                </SelectContent>
              </Select>
              {errors.recurrence_pattern && (
                <p className="text-xs text-red-500 mt-1">{errors.recurrence_pattern}</p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Lista de compras</span>
            <Switch checked={showShoppingList} onCheckedChange={setShowShoppingList} />
          </div>
          {showShoppingList && (
            <ShoppingListBuilder
              items={shoppingItems}
              onChange={(items) => {
                setShoppingItems(items)
                const total = items.reduce((s, i) => s + i.estimated_price * i.quantity, 0)
                if (total > 0) setEstimatedCost(total)
              }}
            />
          )}
          <Button
            onClick={handleSave}
            disabled={saving || title.length < 3}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
