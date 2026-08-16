import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/CurrencyInput'
import { CategoryPicker } from '@/components/CategoryPicker'
import { useCategories } from '@/hooks/use-categories'
import { createSavingsGoal, updateSavingsGoal } from '@/services/savings-goals'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type { SavingsGoal, SavingsGoalStatus } from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  memberId: string
  editing?: SavingsGoal | null
  onSaved?: () => void
}

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
  '#f97316',
  '#22C55E',
]

const ICONS = ['🎯', '🛡️', '🚗', '✈️', '🏠', '📚', '💻', '🏥', '🎓', '💍', '🐱']

const todayISO = () => new Date().toISOString().split('T')[0]

export function SavingsGoalFormSheet({
  open,
  onOpenChange,
  familyId,
  memberId,
  editing,
  onSaved,
}: Props) {
  const { categories } = useCategories(familyId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState(0)
  const [currentAmount, setCurrentAmount] = useState(0)
  const [deadline, setDeadline] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [color, setColor] = useState<string>('#10b981')
  const [icon, setIcon] = useState<string>('🎯')
  const [status, setStatus] = useState<SavingsGoalStatus>('active')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description || '')
      setTargetAmount(editing.target_amount)
      setCurrentAmount(editing.current_amount)
      setDeadline(editing.deadline ? editing.deadline.split(' ')[0].split('T')[0] : '')
      setCategoryId(editing.category_id || null)
      setColor(editing.color || '#10b981')
      setIcon(editing.icon || '🎯')
      setStatus(editing.status)
    } else {
      setTitle('')
      setDescription('')
      setTargetAmount(0)
      setCurrentAmount(0)
      setDeadline('')
      setCategoryId(null)
      setColor('#10b981')
      setIcon('🎯')
      setStatus('active')
    }
    setErrors({})
  }, [open, editing])

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Título obrigatório'
    if (targetAmount <= 0) errs.targetAmount = 'Valor da meta deve ser maior que zero'
    if (currentAmount < 0) errs.currentAmount = 'Valor inválido'
    if (deadline && new Date(deadline) < new Date(todayISO())) {
      // allow past deadline but warn — not a hard error
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const data: Partial<SavingsGoal> = {
        family_id: familyId,
        title: title.trim(),
        description: description.trim() || null,
        target_amount: targetAmount,
        current_amount: currentAmount,
        deadline: deadline || null,
        category_id: categoryId || null,
        color,
        icon,
        status,
        created_by: editing?.created_by || undefined,
      }
      if (editing) {
        await updateSavingsGoal(editing.id, data)
        toast({ title: 'Meta atualizada' })
      } else {
        await createSavingsGoal(data)
        toast({ title: 'Meta criada' })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: getPortugueseError(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? 'Editar Meta' : 'Nova Meta de Economia'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="sg-title" className="text-xs font-semibold text-gray-700">
              Título
            </Label>
            <Input
              id="sg-title"
              placeholder="Exemplo: Reserva de emergência"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className={cn('mt-1', errors.title && 'border-red-500')}
            />
            {errors.title && (
              <p role="alert" className="text-xs text-red-500 mt-1">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="sg-description" className="text-xs font-semibold text-gray-700">
              Descrição (opcional)
            </Label>
            <Input
              id="sg-description"
              placeholder="Detalhes sobre a meta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sg-target" className="text-xs font-semibold text-gray-700">
                Valor da meta
              </label>
              <CurrencyInput
                value={targetAmount}
                onChange={setTargetAmount}
                error={errors.targetAmount}
              />
            </div>
            <div>
              <label htmlFor="sg-current" className="text-xs font-semibold text-gray-700">
                Valor inicial (opcional)
              </label>
              <CurrencyInput
                value={currentAmount}
                onChange={setCurrentAmount}
                error={errors.currentAmount}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sg-deadline" className="text-xs font-semibold text-gray-700">
              Prazo (opcional)
            </Label>
            <Input
              id="sg-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700">Categoria (opcional)</span>
            <div className="mt-1">
              <CategoryPicker
                categories={categories}
                selectedId={categoryId}
                onSelect={setCategoryId}
                familyId={familyId}
                type="investment"
              />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700">Cor</span>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all',
                    color === c && 'ring-2 ring-offset-2 ring-gray-400',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700">Ícone</span>
            <div className="flex gap-2 flex-wrap mt-1">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center border transition-all text-lg',
                    icon === i ? 'border-[#166534] bg-emerald-50' : 'border-gray-200 bg-white',
                  )}
                  aria-label={`Ícone ${i}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="sg-status" className="text-xs font-semibold text-gray-700">
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SavingsGoalStatus)}>
              <SelectTrigger id="sg-status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || targetAmount <= 0 || !title.trim()}
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
