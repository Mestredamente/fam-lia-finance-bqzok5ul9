import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/CurrencyInput'
import { CategoryPicker } from '@/components/CategoryPicker'
import { useCategories } from '@/hooks/use-categories'
import { useCategorizationRules } from '@/hooks/use-categorization-rules'
import { findMatchingCategory } from '@/lib/auto-categorize'
import { createTransaction, updateTransaction } from '@/services/transactions'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

const schema = z
  .object({
    type: z.enum(['expense', 'income', 'investment']),
    amount: z.number().positive('Valor deve ser maior que zero').max(99999999.99),
    description: z.string().min(2, 'Descrição muito curta').max(100, 'Descrição muito longa'),
    category_id: z.string().min(1, 'Selecione uma categoria'),
    transaction_date: z.string().min(1, 'Selecione uma data'),
  })
  .refine(
    (d) => {
      if (d.type === 'investment') return true
      const date = new Date(d.transaction_date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return date <= today
    },
    { message: 'Data não pode ser no futuro', path: ['transaction_date'] },
  )

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  ownerId: string
  editingTransaction?: TransactionRecord | null
  onSaved?: () => void
  defaultIsFixed?: boolean
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  familyId,
  ownerId,
  editingTransaction,
  onSaved,
  defaultIsFixed,
}: Props) {
  const { categories } = useCategories(familyId)
  const [type, setType] = useState<'expense' | 'income' | 'investment'>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isShared, setIsShared] = useState(false)
  const [isFixed, setIsFixed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { rules } = useCategorizationRules(familyId)
  const userTouchedCategory = useRef(false)

  useEffect(() => {
    if (editingTransaction || userTouchedCategory.current) return
    if (!description.trim() || rules.length === 0) return
    const matched = findMatchingCategory(description, rules)
    if (matched) setCategoryId(matched)
  }, [description, rules, editingTransaction])

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setType(editingTransaction.type as 'expense' | 'income' | 'investment')
        setAmount(editingTransaction.amount)
        setDescription(editingTransaction.description)
        setCategoryId(editingTransaction.category_id)
        setDate(editingTransaction.transaction_date.split(' ')[0].split('T')[0])
        setIsShared(editingTransaction.is_shared)
        setIsFixed(editingTransaction.is_fixed)
      } else {
        setType('expense')
        setAmount(0)
        setDescription('')
        setCategoryId(null)
        setDate(new Date().toISOString().split('T')[0])
        setIsShared(false)
        setIsFixed(defaultIsFixed ?? false)
      }
      setErrors({})
      userTouchedCategory.current = false
    }
  }, [open, editingTransaction, defaultIsFixed])

  const handleSave = async () => {
    const result = schema.safeParse({
      type,
      amount,
      description,
      category_id: categoryId || '',
      transaction_date: date,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        errs[i.path[0]] = i.message
      })
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const data = {
        family_id: familyId,
        owner_id: ownerId,
        type,
        amount,
        description,
        category_id: categoryId!,
        transaction_date: new Date(date + 'T12:00:00').toISOString(),
        is_shared: isShared,
        is_fixed: isFixed,
        source: 'manual' as const,
      }
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data)
        toast({ title: 'Transação atualizada' })
      } else {
        await createTransaction(data)
        toast({ title: 'Transação adicionada' })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSaving(false)
    }
  }

  const types = [
    {
      value: 'expense' as const,
      label: 'Despesa',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-500',
    },
    {
      value: 'income' as const,
      label: 'Receita',
      color: 'text-[#22C55E]',
      bg: 'bg-emerald-50',
      border: 'border-[#22C55E]',
    },
    {
      value: 'investment' as const,
      label: 'Investimento',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-500',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-2">
            {types.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={!!editingTransaction}
                onClick={() => setType(t.value)}
                className={cn(
                  'py-3 rounded-xl border-2 font-bold text-sm transition-all',
                  type === t.value
                    ? `${t.bg} ${t.border} ${t.color}`
                    : 'border-gray-200 bg-white text-gray-500',
                  editingTransaction && 'opacity-50 cursor-not-allowed',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Valor</label>
            <CurrencyInput value={amount} onChange={setAmount} error={errors.amount} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Descrição</label>
            <Input
              placeholder="Exemplo: Supermercado"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Categoria</label>
            <div className="mt-1">
              <CategoryPicker
                categories={categories}
                selectedId={categoryId}
                onSelect={(id) => {
                  userTouchedCategory.current = true
                  setCategoryId(id)
                }}
                familyId={familyId}
                type={type}
              />
            </div>
            {errors.category_id && (
              <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Data</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.transaction_date ? 'border-red-500' : ''}
            />
            {errors.transaction_date && (
              <p className="text-xs text-red-500 mt-1">{errors.transaction_date}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Compartilhada com a família</span>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Conta fixa mensal</span>
            <Switch checked={isFixed} onCheckedChange={setIsFixed} />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || amount <= 0 || !description || !categoryId}
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
