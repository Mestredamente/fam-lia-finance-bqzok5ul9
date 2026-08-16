import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { useCreditCards } from '@/hooks/use-credit-cards'
import {
  createRecurringTransaction,
  updateRecurringTransaction,
} from '@/services/recurring-transactions'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type {
  RecurringTransaction,
  RecurringType,
  RecurringFrequency,
  RecurringEmotion,
} from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  memberId: string
  editing?: RecurringTransaction | null
  onSaved?: () => void
}

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
]

const EMOTIONS: { value: RecurringEmotion; label: string; emoji: string }[] = [
  { value: 'feliz', label: 'Feliz', emoji: '😊' },
  { value: 'necessario', label: 'Necessário', emoji: '✅' },
  { value: 'neutro', label: 'Neutro', emoji: '😐' },
  { value: 'arrependido', label: 'Arrependido', emoji: '😬' },
  { value: 'impulsivo', label: 'Impulsivo', emoji: '😤' },
  { value: 'ansioso', label: 'Ansioso', emoji: '😰' },
]

const todayISO = () => new Date().toISOString().split('T')[0]

export function RecurringTransactionFormSheet({
  open,
  onOpenChange,
  familyId,
  memberId,
  editing,
  onSaved,
}: Props) {
  const { categories } = useCategories(familyId)
  const { cards } = useCreditCards(familyId)
  const [type, setType] = useState<RecurringType>('despesa')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [cardId, setCardId] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [emotion, setEmotion] = useState<RecurringEmotion | null>(null)
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setAmount(editing.amount)
      setDescription(editing.description)
      setCategoryId(editing.category_id || null)
      setFrequency(editing.frequency)
      setDayOfMonth(editing.day_of_month)
      setCardId(editing.card_id || null)
      setShared(editing.shared)
      setEmotion(editing.emotion || null)
      setStartDate(editing.start_date.split(' ')[0].split('T')[0])
      setEndDate(editing.end_date ? editing.end_date.split(' ')[0].split('T')[0] : '')
    } else {
      setType('despesa')
      setAmount(0)
      setDescription('')
      setCategoryId(null)
      setFrequency('monthly')
      setDayOfMonth(1)
      setCardId(null)
      setShared(false)
      setEmotion(null)
      setStartDate(todayISO())
      setEndDate('')
    }
    setErrors({})
  }, [open, editing])

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!description.trim()) errs.description = 'Descrição obrigatória'
    if (amount <= 0) errs.amount = 'Valor deve ser maior que zero'
    if (!startDate) errs.startDate = 'Data de início obrigatória'
    if (dayOfMonth < 1 || dayOfMonth > 31) errs.dayOfMonth = 'Dia inválido'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const data: Partial<RecurringTransaction> = {
        family_id: familyId,
        member_id: memberId,
        description: description.trim(),
        amount,
        type,
        category_id: categoryId || null,
        emotion: emotion || null,
        frequency,
        day_of_month: dayOfMonth,
        card_id: cardId || null,
        shared,
        active: editing ? editing.active : true,
        start_date: startDate,
        end_date: endDate || null,
      }
      if (editing) {
        await updateRecurringTransaction(editing.id, data)
        toast({ title: 'Recorrente atualizada' })
      } else {
        await createRecurringTransaction(data)
        toast({ title: 'Recorrente criada' })
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

  const types: {
    value: RecurringType
    label: string
    color: string
    bg: string
    border: string
  }[] = [
    {
      value: 'despesa',
      label: 'Despesa',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-500',
    },
    {
      value: 'receita',
      label: 'Receita',
      color: 'text-[#22C55E]',
      bg: 'bg-emerald-50',
      border: 'border-[#22C55E]',
    },
  ]

  const categoryType = type === 'receita' ? 'income' : 'expense'
  const showDayOfMonth = frequency === 'monthly' || frequency === 'yearly'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? 'Editar Recorrente' : 'Nova Recorrente'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            {types.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setType(t.value)
                  setCategoryId(null)
                }}
                className={cn(
                  'py-3 rounded-xl border-2 font-bold text-sm transition-all',
                  type === t.value
                    ? `${t.bg} ${t.border} ${t.color}`
                    : 'border-gray-200 bg-white text-gray-500',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="rt-amount" className="text-xs font-semibold text-gray-700">
              Valor
            </label>
            <CurrencyInput value={amount} onChange={setAmount} error={errors.amount} />
          </div>

          <div>
            <label htmlFor="rt-description" className="text-xs font-semibold text-gray-700">
              Descrição
            </label>
            <Input
              id="rt-description"
              placeholder="Exemplo: Aluguel"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p role="alert" className="text-xs text-red-500 mt-1">
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700">Categoria</span>
            <div className="mt-1">
              <CategoryPicker
                categories={categories}
                selectedId={categoryId}
                onSelect={setCategoryId}
                familyId={familyId}
                type={categoryType}
              />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-700">Frequência</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={cn(
                    'py-2.5 rounded-xl border-2 font-medium text-sm transition-all',
                    frequency === f.value
                      ? 'border-[#166534] bg-emerald-50 text-[#166534]'
                      : 'border-gray-200 bg-white text-gray-500',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {showDayOfMonth && (
            <div>
              <Label htmlFor="rt-day" className="text-xs font-semibold text-gray-700">
                {frequency === 'yearly'
                  ? 'Dia do mês (vencimento anual)'
                  : 'Dia do mês (vencimento)'}
              </Label>
              <Select
                value={String(dayOfMonth)}
                onValueChange={(v) => setDayOfMonth(parseInt(v, 10))}
              >
                <SelectTrigger id="rt-day" className="mt-1">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Dia {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dayOfMonth && (
                <p role="alert" className="text-xs text-red-500 mt-1">
                  {errors.dayOfMonth}
                </p>
              )}
            </div>
          )}

          {cards.length > 0 && (
            <div>
              <Label htmlFor="rt-card" className="text-xs font-semibold text-gray-700">
                Cartão de crédito (opcional)
              </Label>
              <Select
                value={cardId || 'none'}
                onValueChange={(v) => setCardId(v === 'none' ? null : v)}
              >
                <SelectTrigger id="rt-card" className="mt-1">
                  <SelectValue placeholder="Sem cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cartão</SelectItem>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-gray-700">Emoção padrão (opcional)</span>
            <div className="grid grid-cols-6 gap-1.5 mt-1">
              {EMOTIONS.map((e) => {
                const selected = emotion === e.value
                return (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEmotion(selected ? null : e.value)}
                    aria-pressed={selected}
                    aria-label={e.label}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-lg border-2 transition-all',
                      selected
                        ? 'border-[#166534] bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <span className="text-lg leading-none" aria-hidden="true">
                      {e.emoji}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rt-start" className="text-xs font-semibold text-gray-700">
                Data de início
              </Label>
              <Input
                id="rt-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={errors.startDate ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {errors.startDate && (
                <p role="alert" className="text-xs text-red-500 mt-1">
                  {errors.startDate}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="rt-end" className="text-xs font-semibold text-gray-700">
                Término (opcional)
              </Label>
              <Input
                id="rt-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Compartilhada com a família</span>
            <Switch checked={shared} onCheckedChange={setShared} />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || amount <= 0 || !description.trim()}
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
