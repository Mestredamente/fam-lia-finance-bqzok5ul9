import { useState, useEffect, useRef } from 'react'
import { Loader2, Clock, AlertTriangle, Info } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useCategorizationRules } from '@/hooks/use-categorization-rules'
import { useAnnouncer } from '@/hooks/use-announcer'
import { findMatchingCategory } from '@/lib/auto-categorize'
import {
  createTransaction,
  updateTransaction,
  getTransactionsByFamilyAndMonth,
} from '@/services/transactions'
import { createRecurringTransaction } from '@/services/recurring-transactions'
import { getBudgetsByFamilyId } from '@/services/budgets'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn, formatBRL } from '@/lib/utils'
import { getDebtsByFamilyId } from '@/services/debts'
import type {
  TransactionRecord,
  TransactionEmotion,
  DebtRecord,
  RecurringType,
  RecurringFrequency,
  RecurringEmotion,
} from '@/types/finance'
import type { BudgetRecord } from '@/types/budgets'

/** Map a transaction emotion (EN enum) to the recurring emotion (PT enum). */
function mapEmotionToRecurring(e: TransactionEmotion | null): RecurringEmotion | null {
  if (!e) return null
  const map: Record<TransactionEmotion, RecurringEmotion> = {
    happy: 'feliz',
    necessary: 'necessario',
    neutral: 'neutro',
    regret: 'arrependido',
    impulsive: 'impulsivo',
  }
  return map[e] ?? null
}

/** Map a transaction type to the recurring type (despesa/receita). */
function mapTypeToRecurring(t: TransactionRecord['type']): RecurringType {
  return t === 'income' ? 'receita' : 'despesa'
}

const EMOTIONS: { value: TransactionEmotion; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: 'Feliz' },
  { value: 'necessary', emoji: '✅', label: 'Necessário' },
  { value: 'neutral', emoji: '😐', label: 'Neutro' },
  { value: 'regret', emoji: '😬', label: 'Arrependido' },
  { value: 'impulsive', emoji: '😤', label: 'Impulsivo' },
]

export const EMOTION_META: Record<TransactionEmotion, { emoji: string; label: string }> = {
  happy: { emoji: '😊', label: 'Feliz' },
  necessary: { emoji: '✅', label: 'Necessário' },
  neutral: { emoji: '😐', label: 'Neutro' },
  regret: { emoji: '😬', label: 'Arrependido' },
  impulsive: { emoji: '😤', label: 'Impulsivo' },
}

/** Current local time as HH:MM, used as the default for new transactions. */
function nowHHMM() {
  const d = new Date()
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

const schema = z
  .object({
    type: z.enum(['expense', 'income', 'investment', 'debt_payment']),
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
  const [type, setType] = useState<'expense' | 'income' | 'investment' | 'debt_payment'>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(nowHHMM)
  const [isShared, setIsShared] = useState(false)
  const [isFixed, setIsFixed] = useState(false)
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentTotal, setInstallmentTotal] = useState(1)
  const [installmentCurrent, setInstallmentCurrent] = useState(1)
  const [purchaseDate, setPurchaseDate] = useState('')
  const [debtId, setDebtId] = useState<string | null>(null)
  const [activeDebts, setActiveDebts] = useState<DebtRecord[]>([])
  const [emotion, setEmotion] = useState<TransactionEmotion | null>(null)
  const [emotionNote, setEmotionNote] = useState('')
  // Recurring toggle + fields — only visible/usable when creating a NEW transaction.
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState<number>(1)
  const [recurringStartDate, setRecurringStartDate] = useState('')
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { rules } = useCategorizationRules(familyId)
  const { announce } = useAnnouncer()
  const userTouchedCategory = useRef(false)
  const { isOnline, enqueueTransaction } = useOfflineQueue()

  // Budget cache — loaded once (per family) and reused for the inline warning.
  // Avoids refetching the budgets API on every category selection.
  const budgetsRef = useRef<BudgetRecord[] | null>(null)
  const [budgetsState, setBudgetsState] = useState<BudgetRecord[] | null>(null)
  useEffect(() => {
    if (!familyId || !open) return
    if (budgetsRef.current) {
      setBudgetsState(budgetsRef.current)
      return
    }
    getBudgetsByFamilyId(familyId)
      .then((b) => {
        budgetsRef.current = b
        setBudgetsState(b)
      })
      .catch(() => setBudgetsState(null))
  }, [familyId, open])

  useEffect(() => {
    if (editingTransaction || userTouchedCategory.current) return
    if (!description.trim() || rules.length === 0) return
    const matched = findMatchingCategory(description, rules)
    if (matched) setCategoryId(matched)
  }, [description, rules, editingTransaction])

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setType(editingTransaction.type as 'expense' | 'income' | 'investment' | 'debt_payment')
        setAmount(editingTransaction.amount)
        setDescription(editingTransaction.description)
        setCategoryId(editingTransaction.category_id)
        setDate(editingTransaction.transaction_date.split(' ')[0].split('T')[0])
        const timePart = editingTransaction.transaction_date.split('T')[1]?.split(' ')[0]
        setTime(timePart ? timePart.slice(0, 5) : '12:00')
        setIsShared(editingTransaction.is_shared)
        setIsFixed(editingTransaction.is_fixed)
        setIsInstallment(!!editingTransaction.is_installment)
        setInstallmentTotal(editingTransaction.installment_total ?? 1)
        setInstallmentCurrent(editingTransaction.installment_current ?? 1)
        setPurchaseDate(
          editingTransaction.purchase_date ? editingTransaction.purchase_date.split('T')[0] : '',
        )
        setDebtId(editingTransaction.debt_id ?? null)
        setEmotion((editingTransaction.emotion as TransactionEmotion) || null)
        setEmotionNote(editingTransaction.emotion_note || '')
        // When editing, the recurring toggle is never shown (no recurring creation).
        setIsRecurring(false)
        setFrequency('monthly')
        setDayOfMonth(1)
        setRecurringStartDate('')
        setRecurringEndDate('')
      } else {
        setType('expense')
        setAmount(0)
        setDescription('')
        setCategoryId(null)
        const todayISO = new Date().toISOString().split('T')[0]
        setDate(todayISO)
        setTime(nowHHMM())
        setIsShared(false)
        setIsFixed(defaultIsFixed ?? false)
        setIsInstallment(false)
        setInstallmentTotal(1)
        setInstallmentCurrent(1)
        setPurchaseDate('')
        setDebtId(null)
        setEmotion(null)
        setEmotionNote('')
        // New transaction: default recurring fields from today's date.
        setIsRecurring(false)
        setFrequency('monthly')
        setDayOfMonth(new Date().getDate())
        setRecurringStartDate(todayISO)
        setRecurringEndDate('')
      }
      setErrors({})
      userTouchedCategory.current = false
    }
  }, [open, editingTransaction, defaultIsFixed])

  // Reset installment fields when switching to a type that doesn't support them.
  useEffect(() => {
    if (type !== 'expense' && type !== 'investment') {
      setIsInstallment(false)
      setInstallmentTotal(1)
      setInstallmentCurrent(1)
      setPurchaseDate('')
    }
  }, [type])

  // When the transaction date changes and Recorrente is ON (new transaction),
  // keep dayOfMonth + recurringStartDate in sync with the chosen date.
  useEffect(() => {
    if (editingTransaction || !isRecurring || !date) return
    const day = new Date(date + 'T12:00:00').getDate()
    setDayOfMonth(day)
    setRecurringStartDate(date)
  }, [date, isRecurring, editingTransaction])

  // Load active debts when the form is open in debt_payment mode.
  useEffect(() => {
    if (!open || type !== 'debt_payment') {
      setActiveDebts([])
      return
    }
    let cancelled = false
    getDebtsByFamilyId(familyId)
      .then((debts) => {
        if (!cancelled) setActiveDebts(debts)
      })
      .catch(() => {
        if (!cancelled) setActiveDebts([])
      })
    return () => {
      cancelled = true
    }
  }, [open, type, familyId])

  // Inline budget warning for the currently selected category.
  // Computes spent / limit for the month of the selected transaction date,
  // using the budget cache + a fresh transactions fetch (cached in a ref so
  // switching categories doesn't re-fetch once loaded for a given month).
  const [inlineWarning, setInlineWarning] = useState<{
    pct: number
    spent: number
    limit: number
    remaining: number
    exceeded: boolean
  } | null>(null)

  const transactionsCacheRef = useRef<{ key: string; data: TransactionRecord[] } | null>(null)

  useEffect(() => {
    if (!open || !categoryId || type !== 'expense' || !budgetsState) {
      setInlineWarning(null)
      return
    }
    const budget = budgetsState.find((b) => b.category_id === categoryId)
    if (!budget) {
      setInlineWarning(null)
      return
    }
    const txDate = new Date(`${date}T${time || '12:00'}:00`)
    const y = txDate.getFullYear()
    const m = txDate.getMonth()
    const key = `${familyId}_${y}_${m}`
    const compute = (txs: TransactionRecord[]) => {
      const spent = txs
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === budget.category_id &&
            (!budget.member_id || t.owner_id === budget.member_id),
        )
        .reduce((s, t) => s + t.amount, 0)
      const pct = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0
      if (pct >= 80) {
        setInlineWarning({
          pct,
          spent,
          limit: budget.monthly_limit,
          remaining: budget.monthly_limit - spent,
          exceeded: spent >= budget.monthly_limit,
        })
      } else {
        setInlineWarning(null)
      }
    }
    if (transactionsCacheRef.current && transactionsCacheRef.current.key === key) {
      compute(transactionsCacheRef.current.data)
    } else {
      getTransactionsByFamilyAndMonth(familyId, y, m)
        .then((txs) => {
          transactionsCacheRef.current = { key, data: txs }
          compute(txs)
        })
        .catch(() => setInlineWarning(null))
    }
  }, [open, categoryId, type, budgetsState, date, time, familyId])

  // Post-save budget toast: re-checks the category's budget after the
  // transaction is persisted and surfaces a toast if it crossed ≥80%.
  const checkBudgetAfterSave = async () => {
    if (!isOnline || !categoryId || type !== 'expense') return
    try {
      const budgets = budgetsRef.current || (await getBudgetsByFamilyId(familyId))
      budgetsRef.current = budgets
      const budget = budgets.find((b) => b.category_id === categoryId)
      if (!budget) return
      const txDate = new Date(`${date}T${time || '12:00'}:00`)
      const txs = await getTransactionsByFamilyAndMonth(
        familyId,
        txDate.getFullYear(),
        txDate.getMonth(),
      )
      const spent = txs
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === budget.category_id &&
            (!budget.member_id || t.owner_id === budget.member_id),
        )
        .reduce((s, t) => s + t.amount, 0)
      const pct = budget.monthly_limit > 0 ? Math.round((spent / budget.monthly_limit) * 100) : 0
      const catName = budget.expand?.category_id?.name || 'Categoria'
      if (spent >= budget.monthly_limit) {
        toast({
          variant: 'destructive',
          title: 'Orçamento estourado!',
          description: `${catName}: ${formatBRL(spent)} de ${formatBRL(budget.monthly_limit)}`,
        })
      } else if (pct >= 80) {
        toast({
          title: `Categoria atingiu ${pct}% do orçamento`,
          description: `Restam ${formatBRL(budget.monthly_limit - spent)} de ${formatBRL(
            budget.monthly_limit,
          )}`,
        })
      }
    } catch {
      // noop — never block the save flow
    }
  }

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
      // ── Recorrente: save to recurring_transactions instead of transactions.
      // Only when creating (never when editing) and toggle is ON.
      if (!editingTransaction && isRecurring) {
        await createRecurringTransaction({
          family_id: familyId,
          member_id: ownerId,
          description: description.trim(),
          amount,
          type: mapTypeToRecurring(type),
          category_id: categoryId || null,
          card_id: null,
          emotion: mapEmotionToRecurring(emotion),
          frequency,
          day_of_month: frequency === 'monthly' ? dayOfMonth : 1,
          start_date: recurringStartDate || date,
          end_date: recurringEndDate || null,
          active: true,
          shared: isShared,
        })
        toast({
          title: 'Recorrente criada!',
          description: 'As transações serão geradas automaticamente.',
        })
        announce('Recorrente criada')
        onOpenChange(false)
        onSaved?.()
        return
      }

      const supportsInstallment = type === 'expense' || type === 'investment'
      const data = {
        family_id: familyId,
        owner_id: ownerId,
        type,
        amount,
        description,
        category_id: categoryId!,
        transaction_date: new Date(`${date}T${time || '12:00'}:00`).toISOString(),
        is_shared: isShared,
        is_fixed: isFixed,
        source: 'manual' as const,
        emotion: emotion || null,
        emotion_note: emotionNote || null,
        is_installment: supportsInstallment ? isInstallment : false,
        installment_current: supportsInstallment && isInstallment ? installmentCurrent : null,
        installment_total: supportsInstallment && isInstallment ? installmentTotal : null,
        purchase_date: purchaseDate || null,
        debt_id: type === 'debt_payment' ? debtId : null,
      }
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data)
        toast({ title: 'Transação atualizada' })
        announce('Transação atualizada')
      } else if (!isOnline) {
        // Offline: persist to the local queue for later sync.
        enqueueTransaction(data)
        announce('Transação salva offline')
      } else {
        try {
          await createTransaction(data)
          toast({ title: 'Transação adicionada' })
          announce('Transação criada')
        } catch (err) {
          // Network failed mid-save (connection dropped): enqueue so it isn't lost.
          if (!navigator.onLine) {
            enqueueTransaction(data)
            announce('Transação salva offline')
          } else {
            throw err
          }
        }
      }
      onOpenChange(false)
      onSaved?.()
      // Give the realtime sync a moment to settle before re-checking budgets.
      setTimeout(checkBudgetAfterSave, 500)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
      announce('Erro: ' + getPortugueseError(err), 'assertive')
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
    {
      value: 'debt_payment' as const,
      label: 'Dívida',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-500',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-2">
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
            <label htmlFor="tx-amount" className="text-xs font-semibold text-gray-700">
              Valor
            </label>
            <CurrencyInput
              id="tx-amount"
              value={amount}
              onChange={setAmount}
              error={errors.amount}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="tx-description" className="text-xs font-semibold text-gray-700">
              Descrição
            </label>
            <Input
              id="tx-description"
              placeholder="Exemplo: Supermercado"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              aria-required="true"
              aria-describedby={errors.description ? 'tx-description-error' : undefined}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p
                id="tx-description-error"
                role="alert"
                aria-live="assertive"
                className="text-xs text-red-500 mt-1"
              >
                {errors.description}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="tx-category" className="text-xs font-semibold text-gray-700">
              Categoria
            </label>
            <div className="mt-1">
              <CategoryPicker
                categories={categories}
                selectedId={categoryId}
                onSelect={(id) => {
                  userTouchedCategory.current = true
                  setCategoryId(id)
                }}
                familyId={familyId}
                type={
                  type === 'debt_payment' ? 'debt' : (type as 'expense' | 'income' | 'investment')
                }
                aria-required="true"
              />
            </div>
            {errors.category_id && (
              <p role="alert" aria-live="assertive" className="text-xs text-red-500 mt-1">
                {errors.category_id}
              </p>
            )}
            {inlineWarning && (
              <div
                role="status"
                className={cn(
                  'mt-2 flex items-start gap-2 rounded-lg p-2.5 text-xs',
                  inlineWarning.exceeded
                    ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300',
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  {inlineWarning.exceeded
                    ? `🚫 Esta categoria ESTOUROU o orçamento! ${formatBRL(
                        inlineWarning.spent,
                      )} de ${formatBRL(inlineWarning.limit)}.`
                    : `⚠️ Esta categoria está em ${Math.round(
                        inlineWarning.pct,
                      )}% do orçamento (${formatBRL(inlineWarning.spent)} de ${formatBRL(
                        inlineWarning.limit,
                      )}). Restam ${formatBRL(Math.max(inlineWarning.remaining, 0))}.`}
                </span>
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700">
              Como você se sentiu com esta compra?
            </span>
            <p className="text-[11px] text-gray-400 mb-2">Opcional</p>
            <div className="grid grid-cols-5 gap-2" role="group" aria-label="Emoção da compra">
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
                      'flex flex-col items-center justify-center gap-1 py-2 rounded-xl border-2 transition-all',
                      selected
                        ? 'border-[#166534] bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {e.emoji}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium leading-tight text-center',
                        selected ? 'text-[#166534]' : 'text-gray-500',
                      )}
                    >
                      {e.label}
                    </span>
                  </button>
                )
              })}
            </div>
            <Textarea
              placeholder="O que te motivou a comprar?"
              value={emotionNote}
              onChange={(e) => setEmotionNote(e.target.value)}
              maxLength={200}
              rows={2}
              className="mt-2 text-sm resize-none"
              aria-label="Nota sobre a emoção da compra"
            />
            <p className="text-[11px] text-gray-400 mt-0.5 text-right">{emotionNote.length}/200</p>
          </div>
          {/* Parcelamento — só para expense e investment */}
          {(type === 'expense' || type === 'investment') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Parcelado
                </span>
                <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
              </div>
              {isInstallment && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="tx-installment-total"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Total de parcelas
                    </label>
                    <Input
                      id="tx-installment-total"
                      type="number"
                      min={2}
                      max={120}
                      value={installmentTotal}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setInstallmentTotal(Number.isNaN(v) ? 1 : Math.min(120, Math.max(1, v)))
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tx-installment-current"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Parcela atual
                    </label>
                    <Input
                      id="tx-installment-current"
                      type="number"
                      min={1}
                      max={installmentTotal}
                      value={installmentCurrent}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setInstallmentCurrent(
                          Number.isNaN(v) ? 1 : Math.min(installmentTotal, Math.max(1, v)),
                        )
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label
                      htmlFor="tx-purchase-date"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Data da compra (opcional)
                    </label>
                    <Input
                      id="tx-purchase-date"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      placeholder="Mesma da transação"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Dívida vinculada — só para debt_payment */}
          {type === 'debt_payment' && (
            <div>
              <label
                htmlFor="tx-debt"
                className="text-xs font-semibold text-gray-700 dark:text-gray-200"
              >
                Dívida vinculada
              </label>
              <select
                id="tx-debt"
                value={debtId || ''}
                onChange={(e) => setDebtId(e.target.value || null)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 text-sm"
              >
                <option value="">Nenhuma (pagamento avulso)</option>
                {activeDebts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.description} — {formatBRL(d.installment_value)}/mês (restam{' '}
                    {d.installments_remaining})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-date" className="text-xs font-semibold text-gray-700">
                Data
              </label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-required="true"
                className={errors.transaction_date ? 'border-red-500' : ''}
              />
              {errors.transaction_date && (
                <p role="alert" aria-live="assertive" className="text-xs text-red-500 mt-1">
                  {errors.transaction_date}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="tx-time"
                className="flex items-center gap-1 text-xs font-semibold text-gray-700"
              >
                <Clock className="h-3 w-3" />
                Horário
              </label>
              <Input
                id="tx-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Compartilhada com a família</span>
            <Switch checked={isShared} onCheckedChange={setIsShared} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Conta fixa mensal</span>
            <Switch checked={isFixed} onCheckedChange={setIsFixed} />
          </div>
          {/* Recorrente — only shown when creating a NEW transaction. */}
          {editingTransaction &&
            (editingTransaction.recurring_id || editingTransaction.source === 'recurring') && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-700 dark:text-amber-300">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Esta transação foi gerada por uma recorrente. Para alterar a recorrência, edite-a
                  na página de Recorrentes.
                </span>
              </div>
            )}
          {!editingTransaction && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  🔁 Recorrente
                </span>
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <div className="space-y-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 p-3 border border-emerald-100 dark:border-emerald-900/40">
                  <div>
                    <Label
                      htmlFor="tx-frequency"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Frequência
                    </Label>
                    <Select
                      value={frequency}
                      onValueChange={(v) => setFrequency(v as RecurringFrequency)}
                    >
                      <SelectTrigger id="tx-frequency" className="mt-1">
                        <SelectValue placeholder="Frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {frequency === 'monthly' && (
                    <div>
                      <Label
                        htmlFor="tx-day-of-month"
                        className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Dia do mês
                      </Label>
                      <Input
                        id="tx-day-of-month"
                        type="number"
                        min={1}
                        max={31}
                        value={dayOfMonth}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          setDayOfMonth(Number.isNaN(v) ? 1 : Math.min(31, Math.max(1, v)))
                        }}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <Label
                      htmlFor="tx-recurring-start"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Início
                    </Label>
                    <Input
                      id="tx-recurring-start"
                      type="date"
                      value={recurringStartDate}
                      onChange={(e) => setRecurringStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="tx-recurring-end"
                        className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Fim (opcional)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor="tx-no-end"
                          className="text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer"
                        >
                          Sem data de fim
                        </Label>
                        <Switch
                          id="tx-no-end"
                          checked={!recurringEndDate}
                          onCheckedChange={(checked) => {
                            if (checked) setRecurringEndDate('')
                          }}
                        />
                      </div>
                    </div>
                    <Input
                      id="tx-recurring-end"
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      disabled={!recurringEndDate}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
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
