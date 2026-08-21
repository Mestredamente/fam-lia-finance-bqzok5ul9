import { useState, useEffect, useRef, useMemo } from 'react'
import { Loader2, Clock, AlertTriangle, Info, Sparkles, Repeat, Layers, Pencil } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { useAccounts } from '@/hooks/use-accounts'
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
import { useSuggestCategory } from '@/hooks/use-suggest-category'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn, formatBRL } from '@/lib/utils'
import type {
  TransactionRecord,
  TransactionType,
  TransactionEmotion,
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
    grateful: 'feliz',
    surprised: 'feliz',
    anxious: 'ansioso',
  }
  return map[e] ?? null
}

/** Map a transaction type to the recurring type (despesa/receita). */
function mapTypeToRecurring(t: TransactionRecord['type']): RecurringType {
  return t === 'income' ? 'receita' : 'despesa'
}

/** Emotions available per transaction type. */
const EMOTIONS_BY_TYPE: Record<
  'expense' | 'income',
  { value: TransactionEmotion; emoji: string; label: string }[]
> = {
  expense: [
    { value: 'happy', emoji: '😊', label: 'Feliz' },
    { value: 'necessary', emoji: '✅', label: 'Necessário' },
    { value: 'neutral', emoji: '😐', label: 'Neutro' },
    { value: 'regret', emoji: '😬', label: 'Arrependido' },
    { value: 'impulsive', emoji: '😤', label: 'Impulsivo' },
    { value: 'anxious', emoji: '😰', label: 'Ansioso' },
  ],
  income: [
    { value: 'happy', emoji: '😊', label: 'Feliz' },
    { value: 'grateful', emoji: '🙏', label: 'Grato' },
    { value: 'surprised', emoji: '🎉', label: 'Surpreso' },
    { value: 'neutral', emoji: '😐', label: 'Neutro' },
  ],
}

export const EMOTION_META: Record<TransactionEmotion, { emoji: string; label: string }> = {
  happy: { emoji: '😊', label: 'Feliz' },
  necessary: { emoji: '✅', label: 'Necessário' },
  neutral: { emoji: '😐', label: 'Neutro' },
  regret: { emoji: '😬', label: 'Arrependido' },
  impulsive: { emoji: '😤', label: 'Impulsivo' },
  grateful: { emoji: '🙏', label: 'Grato' },
  surprised: { emoji: '🎉', label: 'Surpreso' },
  anxious: { emoji: '😰', label: 'Ansioso' },
}

/** Current local time as HH:MM, used as the default for new transactions. */
function nowHHMM() {
  const d = new Date()
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

/**
 * Sanitize a numeric text input.
 *
 * Used for installment / day / quantity fields: returns an empty string when
 * the user clears the field (so the placeholder shows) and strips leading
 * zeros. Clamps into [min, max].
 */
function sanitizeIntInput(raw: string, min: number, max: number): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10)
  if (Number.isNaN(n)) return ''
  const clamped = Math.min(max, Math.max(min, n))
  // strip leading zeros (e.g. "007" → "7")
  return String(clamped)
}

/** Detects a parcela count in a description ("Notebook em 10x" → 10). */
export function detectInstallmentCount(desc: string): number | null {
  if (!desc) return null
  const patterns = [
    /em\s+(\d+)\s*x/i,
    /(\d+)\s*x\b/i,
    /parcelado\s+em\s+(\d+)/i,
    /em\s+(\d+)\s*vezes/i,
    /(\d+)\s*vezes/i,
    /(\d+)\s*parcelas/i,
  ]
  for (const re of patterns) {
    const m = desc.match(re)
    if (m && m[1]) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > 1) return n
    }
  }
  return null
}

const schema = z
  .object({
    type: z.enum(['expense', 'income']),
    amount: z.number().positive('Valor deve ser maior que zero').max(99999999.99),
    description: z.string().min(2, 'Descrição muito curta').max(100, 'Descrição muito longa'),
    category_id: z.string().min(1, 'Selecione uma categoria'),
    transaction_date: z.string().min(1, 'Selecione uma data'),
  })
  .refine(
    (d) => {
      const date = new Date(d.transaction_date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return date <= today
    },
    { message: 'Data não pode ser no futuro', path: ['transaction_date'] },
  )

type PaymentMode = 'once' | 'installment' | 'recurring'

export interface TransactionPrefill {
  type?: TransactionType
  amount?: number
  description?: string
  categoryId?: string | null
  accountId?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  ownerId: string
  editingTransaction?: TransactionRecord | null
  onSaved?: () => void
  defaultIsFixed?: boolean
  prefill?: TransactionPrefill | null
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  familyId,
  ownerId,
  editingTransaction,
  onSaved,
  defaultIsFixed,
  prefill,
}: Props) {
  const { categories } = useCategories(familyId)
  const { activeAccounts } = useAccounts(familyId)
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [transferToAccountId, setTransferToAccountId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(nowHHMM)
  const [isShared, setIsShared] = useState(false)
  const [isFixed, setIsFixed] = useState(false)
  // Payment mode (radio group — mutually exclusive).
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('once')
  // Installment fields — kept as strings so the inputs start EMPTY.
  const [installmentTotalStr, setInstallmentTotalStr] = useState('')
  const [installmentCurrentStr, setInstallmentCurrentStr] = useState('')
  const [installmentValueStr, setInstallmentValueStr] = useState('')
  const [installmentStartDate, setInstallmentStartDate] = useState('')
  const [installmentDueDayStr, setInstallmentDueDayStr] = useState('')
  // Recurring fields.
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [dayOfMonthStr, setDayOfMonthStr] = useState('')
  const [recurringStartDate, setRecurringStartDate] = useState('')
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [noEndDate, setNoEndDate] = useState(true)
  // Emotion / notes.
  const [emotion, setEmotion] = useState<TransactionEmotion | null>(null)
  const [emotionNote, setEmotionNote] = useState('')
  // Auto-suggestion flags.
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)
  const [suggestedInstallment, setSuggestedInstallment] = useState(false)
  // Bookkeeping.
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { rules } = useCategorizationRules(familyId)
  const { announce } = useAnnouncer()
  const userTouchedCategory = useRef(false)
  const userTouchedInstallment = useRef(false)
  const userTouchedPaymentMode = useRef(false)
  const lastInstallmentToastRef = useRef<number | null>(null)
  const { isOnline, enqueueTransaction } = useOfflineQueue()

  // History-based category suggestion (≥3 past transactions with the same
  // description + category → confidence > 0.7). Disabled while editing or
  // once the user has manually picked a category this session.
  const categorySuggestion = useSuggestCategory(
    description,
    familyId,
    !editingTransaction && !userTouchedCategory.current,
  )

  // Derived numeric values (null when empty / invalid).
  const installmentTotal = useMemo(() => {
    const n = parseInt(installmentTotalStr, 10)
    return Number.isNaN(n) || n <= 0 ? null : n
  }, [installmentTotalStr])
  const installmentCurrent = useMemo(() => {
    const n = parseInt(installmentCurrentStr, 10)
    return Number.isNaN(n) || n <= 0 ? null : n
  }, [installmentCurrentStr])
  const installmentDueDay = useMemo(() => {
    const n = parseInt(installmentDueDayStr, 10)
    return Number.isNaN(n) || n < 1 || n > 31 ? null : n
  }, [installmentDueDayStr])
  const installmentValue = useMemo(() => {
    // user-edited overrides auto-calc when non-empty
    if (installmentValueStr) {
      const n = parseFloat(installmentValueStr.replace(',', '.'))
      return Number.isNaN(n) ? null : n
    }
    if (amount > 0 && installmentTotal) {
      return Math.round((amount / installmentTotal) * 100) / 100
    }
    return null
  }, [installmentValueStr, amount, installmentTotal])
  const dayOfMonth = useMemo(() => {
    const n = parseInt(dayOfMonthStr, 10)
    return Number.isNaN(n) || n < 1 || n > 31 ? null : n
  }, [dayOfMonthStr])

  // Estimated termination date for installments: start + total months.
  const installmentEndDate = useMemo(() => {
    if (!installmentStartDate || !installmentTotal) return ''
    const d = new Date(installmentStartDate + 'T12:00:00')
    d.setMonth(d.getMonth() + installmentTotal)
    return d.toISOString().split('T')[0]
  }, [installmentStartDate, installmentTotal])

  // Budget cache — loaded once (per family) and reused for the inline warning.
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

  // ── Auto-category suggestion (debounced 500ms) ──
  // Two sources, in priority order:
  //  1. History-based (useSuggestCategory) — only when confidence > 0.7
  //     (≥3 past transactions with the same description + category).
  //  2. Categorization rules — keyword match against the family's rules.
  // Either source sets the category and flags it as "suggested" so the UI
  // can show a hint badge. Both are suppressed once the user manually picks
  // a category (session-scoped via the userTouchedCategory ref).
  useEffect(() => {
    if (editingTransaction || userTouchedCategory.current) return
    if (!description.trim()) return
    const handle = setTimeout(() => {
      // History suggestion takes priority when it meets the confidence bar.
      if (
        categorySuggestion.confidence > 0.7 &&
        categorySuggestion.categoryId &&
        categorySuggestion.categoryId !== categoryId
      ) {
        setCategoryId(categorySuggestion.categoryId)
        setSuggestedCategory(categorySuggestion.categoryId)
        return
      }
      // Fall back to keyword rules.
      if (rules.length === 0) return
      const matched = findMatchingCategory(description, rules)
      if (matched && matched !== categoryId) {
        setCategoryId(matched)
        setSuggestedCategory(matched)
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [description, rules, editingTransaction, categoryId, categorySuggestion])

  // Clear "suggested" flag whenever the user picks a category themselves.
  useEffect(() => {
    if (userTouchedCategory.current && suggestedCategory && categoryId !== suggestedCategory) {
      setSuggestedCategory(null)
    }
  }, [categoryId, suggestedCategory])

  // ── Auto-parcelado suggestion (debounced 300ms) ──
  // When the description contains a pattern like "10x" / "em 10x" / "10 vezes",
  // auto-select Parcelado mode + prefill the installment total (unless the
  // user has already touched the installment total field), and show a subtle
  // toast the first time a count is detected for the current description.
  useEffect(() => {
    if (editingTransaction) return
    if (!description.trim()) {
      setSuggestedInstallment(false)
      lastInstallmentToastRef.current = null
      return
    }
    const handle = setTimeout(() => {
      const n = detectInstallmentCount(description)
      if (n && n > 1) {
        // Respect a manual override: once the user has switched to "À vista"
        // or "Recorrente" themselves, don't re-activate auto-parcelado for
        // this form session (spec: "não reativar o auto-parcelado").
        if (
          type === 'expense' &&
          paymentMode !== 'installment' &&
          !userTouchedPaymentMode.current
        ) {
          setPaymentMode('installment')
          setSuggestedInstallment(true)
        }
        if (!userTouchedInstallment.current && !userTouchedPaymentMode.current) {
          setInstallmentTotalStr(String(n))
        }
        if (lastInstallmentToastRef.current !== n && !userTouchedPaymentMode.current) {
          lastInstallmentToastRef.current = n
          toast({ title: `Parcelamento detectado: ${n}x` })
        }
      } else {
        setSuggestedInstallment(false)
        lastInstallmentToastRef.current = null
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [description, editingTransaction, type, paymentMode])

  // Reset form state when opening.
  useEffect(() => {
    if (open) {
      const todayISO = new Date().toISOString().split('T')[0]
      const todayDay = new Date().getDate()
      if (editingTransaction) {
        setType(editingTransaction.type)
        setAmount(editingTransaction.amount)
        setDescription(editingTransaction.description)
        setCategoryId(editingTransaction.category_id || null)
        setAccountId(editingTransaction.account_id || null)
        setTransferToAccountId(editingTransaction.transfer_to_account_id || null)
        setDate(editingTransaction.transaction_date.split(' ')[0].split('T')[0])
        const timePart = editingTransaction.transaction_date.split('T')[1]?.split(' ')[0]
        setTime(timePart ? timePart.slice(0, 5) : '12:00')
        setIsShared(editingTransaction.is_shared)
        setIsFixed(editingTransaction.is_fixed)
        // Determine payment mode from the existing record.
        if (editingTransaction.is_installment) {
          setPaymentMode('installment')
          setInstallmentTotalStr(
            editingTransaction.installment_total != null
              ? String(editingTransaction.installment_total)
              : '',
          )
          setInstallmentCurrentStr(
            editingTransaction.installment_current != null
              ? String(editingTransaction.installment_current)
              : '',
          )
          setInstallmentValueStr('')
          setInstallmentStartDate(
            editingTransaction.installment_start_date
              ? editingTransaction.installment_start_date.split('T')[0]
              : editingTransaction.transaction_date.split(' ')[0].split('T')[0],
          )
          setInstallmentDueDayStr(
            editingTransaction.installment_due_day != null
              ? String(editingTransaction.installment_due_day)
              : String(todayDay),
          )
        } else if (editingTransaction.source === 'recurring' || editingTransaction.recurring_id) {
          setPaymentMode('recurring')
          setFrequency('monthly')
          setDayOfMonthStr(String(todayDay))
          setRecurringStartDate(editingTransaction.transaction_date.split(' ')[0].split('T')[0])
          setRecurringEndDate('')
          setNoEndDate(true)
        } else {
          setPaymentMode('once')
          setInstallmentTotalStr('')
          setInstallmentCurrentStr('')
          setInstallmentValueStr('')
          setInstallmentStartDate('')
          setInstallmentDueDayStr('')
          setFrequency('monthly')
          setDayOfMonthStr('')
          setRecurringStartDate('')
          setRecurringEndDate('')
          setNoEndDate(true)
        }
        setEmotion((editingTransaction.emotion as TransactionEmotion) || null)
        setEmotionNote(editingTransaction.emotion_note || '')
        setSuggestedCategory(null)
        setSuggestedInstallment(false)
      } else {
        setType('expense')
        setAmount(0)
        setDescription('')
        setCategoryId(null)
        setAccountId(null)
        setTransferToAccountId(null)
        setDate(todayISO)
        setTime(nowHHMM())
        setIsShared(false)
        setIsFixed(defaultIsFixed ?? false)
        setPaymentMode('once')
        setInstallmentTotalStr('')
        setInstallmentCurrentStr('')
        setInstallmentValueStr('')
        setInstallmentStartDate('')
        setInstallmentDueDayStr('')
        setFrequency('monthly')
        setDayOfMonthStr(String(todayDay))
        setRecurringStartDate(todayISO)
        setRecurringEndDate('')
        setNoEndDate(true)
        setEmotion(null)
        setEmotionNote('')
        setSuggestedCategory(null)
        setSuggestedInstallment(false)
        // Apply external prefill (e.g. "Pagar agora" from the bills page).
        if (prefill) {
          if (prefill.type) setType(prefill.type)
          if (typeof prefill.amount === 'number') setAmount(prefill.amount)
          if (prefill.description) setDescription(prefill.description)
          if (prefill.categoryId) setCategoryId(prefill.categoryId)
          if (prefill.accountId) setAccountId(prefill.accountId)
        }
      }
      setErrors({})
      userTouchedCategory.current = false
      userTouchedInstallment.current = false
      userTouchedPaymentMode.current = false
    }
  }, [open, editingTransaction, defaultIsFixed, prefill])

  // Reset installment fields when switching away from expense.
  useEffect(() => {
    if (type !== 'expense' && paymentMode === 'installment') {
      setPaymentMode('once')
    }
  }, [type, paymentMode])

  // When the type changes, clear the selected emotion if it is no longer valid
  useEffect(() => {
    setEmotion((prev) => {
      if (prev && EMOTIONS_BY_TYPE[type].some((e) => e.value === prev)) return prev
      return null
    })
  }, [type])

  // Keep recurring day/start-date in sync with the chosen transaction date
  // when Recorrente is ON (new transaction).
  useEffect(() => {
    if (editingTransaction || paymentMode !== 'recurring' || !date) return
    const day = new Date(date + 'T12:00:00').getDate()
    setDayOfMonthStr(String(day))
    setRecurringStartDate(date)
  }, [date, paymentMode, editingTransaction])

  // When installment start date changes and due-day is empty, default it to
  // the day of the start date (only when the user hasn't picked one).
  useEffect(() => {
    if (paymentMode !== 'installment' || !installmentStartDate) return
    if (userTouchedInstallment.current) return
    const day = new Date(installmentStartDate + 'T12:00:00').getDate()
    if (installmentDueDayStr === '') setInstallmentDueDayStr(String(day))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installmentStartDate, paymentMode])

  // Inline budget warning for the currently selected category.
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
    // Validação especial para transferências
    if (type === 'transfer') {
      const errs: Record<string, string> = {}
      if (amount <= 0) errs.amount = 'Valor deve ser maior que zero'
      if (!description.trim()) errs.description = 'Descrição é obrigatória'
      if (!accountId) errs.account_id = 'Selecione a conta de origem'
      if (!transferToAccountId) errs.transfer_to_account_id = 'Selecione a conta de destino'
      if (accountId && transferToAccountId && accountId === transferToAccountId) {
        errs.transfer_to_account_id = 'Contas de origem e destino devem ser diferentes'
      }
      if (Object.keys(errs).length > 0) {
        setErrors(errs)
        return
      }
    } else {
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
          errs[String(i.path[0])] = i.message
        })
        setErrors(errs)
        return
      }
    }
    setSaving(true)
    try {
      // ── Recorrente: save to recurring_transactions instead of transactions.
      // Only when creating (never when editing) and mode is "recurring".
      if (!editingTransaction && paymentMode === 'recurring') {
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
          day_of_month: frequency === 'monthly' ? dayOfMonth || 1 : 1,
          start_date: recurringStartDate || date,
          end_date: noEndDate ? null : recurringEndDate || null,
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

      const isInstallment =
        type === 'expense' && paymentMode === 'installment' && installmentTotal != null
      // Se for transferência e não houver categoryId, pegamos a primeira categoria de despesa/outros ou omitimos
      const defaultCatId = categoryId || categories[0]?.id || ''

      const data = {
        family_id: familyId,
        owner_id: ownerId,
        type,
        amount,
        description,
        category_id: defaultCatId,
        account_id: accountId || null,
        transfer_to_account_id: type === 'transfer' ? transferToAccountId || null : null,
        transaction_date: new Date(`${date}T${time || '12:00'}:00`).toISOString(),
        is_shared: isShared,
        is_fixed: isFixed,
        source: 'manual' as const,
        emotion: type === 'transfer' ? null : emotion || null,
        emotion_note: type === 'transfer' ? null : emotionNote || null,
        is_installment: isInstallment,
        installment_current: isInstallment ? (installmentCurrent ?? 1) : null,
        installment_total: isInstallment ? installmentTotal : null,
        installment_due_day: isInstallment ? (installmentDueDay ?? null) : null,
        installment_start_date: isInstallment ? installmentStartDate || date : null,
        // Preserve an existing purchase_date when editing; new transactions
        // have none (the new form replaces it with installment_start_date).
        purchase_date: editingTransaction?.purchase_date ?? null,
      }
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data)
        toast({ title: 'Transação atualizada' })
        announce('Transação atualizada')
      } else if (!isOnline) {
        enqueueTransaction(data)
        announce('Transação salva offline')
      } else {
        try {
          await createTransaction(data)
          toast({ title: 'Transação adicionada' })
          announce('Transação criada')
        } catch (err) {
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
      setTimeout(checkBudgetAfterSave, 500)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
      announce('Erro: ' + getPortugueseError(err), 'assertive')
    } finally {
      setSaving(false)
    }
  }

  const typeLabel =
    type === 'income' ? 'receita' : type === 'transfer' ? 'transferência' : 'despesa'
  const typeAction = type === 'income' ? 'registrar' : type === 'transfer' ? 'transferir' : 'gastar'
  const emotions = type === 'transfer' ? [] : EMOTIONS_BY_TYPE[type as 'expense' | 'income']

  // Show the suggested badge only when the current category came from an
  // auto-suggestion (and the user hasn't replaced it).
  const showSuggestedBadge =
    !!suggestedCategory && categoryId === suggestedCategory && !userTouchedCategory.current

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto flex-1 px-0">
          <div className="space-y-4 mt-4">
            {/* 1. Tipo (Despesa / Receita / Transferência) */}
            <div className="grid grid-cols-3 gap-2">
              {[
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
                  value: 'transfer' as const,
                  label: 'Transferir',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                  border: 'border-blue-500',
                },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  disabled={!!editingTransaction}
                  onClick={() => {
                    setType(t.value)
                    if (t.value === 'transfer' && paymentMode !== 'once') {
                      setPaymentMode('once')
                    }
                  }}
                  className={cn(
                    'py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all',
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

            {/* 2. Valor */}
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
                emptyOnZero
                placeholder="R$ 0,00"
              />
            </div>

            {/* 3. Data */}
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
                  className={cn('mt-1', errors.transaction_date && 'border-red-500')}
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

            {/* Conta Bancária / Transferência */}
            {type === 'transfer' ? (
              <div className="space-y-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                  Contas da Transferência
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label
                      htmlFor="tx-source-account"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Conta Origem (debitar) *
                    </Label>
                    <Select
                      value={accountId || 'none'}
                      onValueChange={(v) => setAccountId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger id="tx-source-account" className="mt-1 bg-white dark:bg-card">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione uma conta</SelectItem>
                        {activeAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({formatBRL(acc.current_balance || 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.account_id && (
                      <p className="text-xs text-red-500 mt-1">{errors.account_id}</p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="tx-dest-account"
                      className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Conta Destino (creditar) *
                    </Label>
                    <Select
                      value={transferToAccountId || 'none'}
                      onValueChange={(v) => setTransferToAccountId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger id="tx-dest-account" className="mt-1 bg-white dark:bg-card">
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione uma conta</SelectItem>
                        {activeAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({formatBRL(acc.current_balance || 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.transfer_to_account_id && (
                      <p className="text-xs text-red-500 mt-1">{errors.transfer_to_account_id}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label
                  htmlFor="tx-account"
                  className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                >
                  Conta Bancária (opcional)
                </Label>
                <Select
                  value={accountId || 'none'}
                  onValueChange={(v) => setAccountId(v === 'none' ? null : v)}
                >
                  <SelectTrigger id="tx-account" className="mt-1">
                    <SelectValue placeholder="Nenhuma conta vinculada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma conta vinculada</SelectItem>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({formatBRL(acc.current_balance || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 4. Como pagar */}
            {type !== 'transfer' && (
              <div className="space-y-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Como pagar
                  </span>
                  {suggestedInstallment && (
                    <Badge className="bg-violet-100 text-violet-700 border-0 gap-1 text-[10px]">
                      <Sparkles className="h-2.5 w-2.5" /> Sugerido
                    </Badge>
                  )}
                </div>
                <RadioGroup
                  value={paymentMode}
                  onValueChange={(v) => {
                    // Track manual payment-mode overrides so auto-parcelado
                    // doesn't re-activate after the user picks "À vista" or
                    // "Recorrente". Manually choosing "Parcelado" re-enables
                    // the helpful auto-fill of the installment total.
                    userTouchedPaymentMode.current = v !== 'installment'
                    setPaymentMode(v as PaymentMode)
                  }}
                  className="grid grid-cols-3 gap-2"
                >
                  {(
                    [
                      { value: 'once', label: 'À vista' },
                      { value: 'installment', label: 'Parcelado' },
                      { value: 'recurring', label: 'Recorrente' },
                    ] as const
                  ).map((opt) => (
                    <Label
                      key={opt.value}
                      className={cn(
                        'flex items-center justify-center gap-1.5 p-2.5 rounded-lg border cursor-pointer hover:bg-accent text-sm font-medium',
                        paymentMode === opt.value &&
                          'border-[#166534] bg-[#166534]/5 text-[#166534] dark:text-emerald-400',
                        editingTransaction && opt.value === 'recurring' && 'opacity-50',
                      )}
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`pay-${opt.value}`}
                        className="sr-only"
                      />
                      <span>{opt.label}</span>
                    </Label>
                  ))}
                </RadioGroup>

                {/* Parcelado */}
                {paymentMode === 'installment' && (
                  <div className="space-y-3 rounded-xl bg-white dark:bg-card p-3 border border-violet-100 dark:border-violet-900/40">
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
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={installmentTotalStr}
                          onChange={(e) => {
                            userTouchedInstallment.current = true
                            setInstallmentTotalStr(sanitizeIntInput(e.target.value, 1, 120))
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
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          value={installmentCurrentStr}
                          onChange={(e) =>
                            setInstallmentCurrentStr(sanitizeIntInput(e.target.value, 1, 120))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tx-installment-value"
                          className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                        >
                          Valor da parcela
                        </label>
                        <Input
                          id="tx-installment-value"
                          type="text"
                          inputMode="decimal"
                          placeholder="auto"
                          value={
                            installmentValueStr === '' && installmentValue != null
                              ? installmentValue.toFixed(2).replace('.', ',')
                              : installmentValueStr
                          }
                          onChange={(e) =>
                            setInstallmentValueStr(e.target.value.replace(/[^\d.,]/g, ''))
                          }
                          className="mt-1 bg-gray-50 dark:bg-gray-900/40"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tx-installment-due-day"
                          className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                        >
                          Dia de vencimento
                        </label>
                        <Input
                          id="tx-installment-due-day"
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          value={installmentDueDayStr}
                          onChange={(e) =>
                            setInstallmentDueDayStr(sanitizeIntInput(e.target.value, 1, 31))
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tx-installment-start"
                          className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                        >
                          Data de início
                        </label>
                        <Input
                          id="tx-installment-start"
                          type="date"
                          value={installmentStartDate}
                          onChange={(e) => setInstallmentStartDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                          Término estimado
                        </label>
                        <div className="mt-1 h-9 px-3 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-500 dark:text-gray-400">
                          {installmentEndDate || '—'}
                        </div>
                      </div>
                    </div>
                    {installmentTotal != null && installmentValue != null && amount > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <Layers className="h-3 w-3 inline mr-1" />
                        {installmentTotal}x de {formatBRL(installmentValue)} = {formatBRL(amount)}{' '}
                        total
                      </p>
                    )}
                  </div>
                )}

                {/* Recorrente */}
                {paymentMode === 'recurring' && (
                  <div className="space-y-3 rounded-xl bg-white dark:bg-card p-3 border border-sky-100 dark:border-sky-900/40">
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
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          value={dayOfMonthStr}
                          onChange={(e) =>
                            setDayOfMonthStr(sanitizeIntInput(e.target.value, 1, 31))
                          }
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
                    {/* Toggle "Sem data de fim" — clicável E desclicável */}
                    <div className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                      <Label
                        htmlFor="tx-no-end"
                        className="text-xs font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                      >
                        Sem data de fim
                      </Label>
                      <Switch
                        id="tx-no-end"
                        checked={noEndDate}
                        onCheckedChange={(checked) => setNoEndDate(!!checked)}
                      />
                    </div>
                    {!noEndDate && (
                      <div>
                        <Label
                          htmlFor="tx-recurring-end"
                          className="text-xs font-semibold text-gray-700 dark:text-gray-200"
                        >
                          Data de fim
                        </Label>
                        <Input
                          id="tx-recurring-end"
                          type="date"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <Repeat className="h-3 w-3 inline mr-1" />
                      {formatBRL(amount)}
                      {frequency === 'monthly'
                        ? '/mês'
                        : frequency === 'weekly'
                          ? '/semana'
                          : '/ano'}{' '}
                      até {noEndDate ? 'indefinido' : recurringEndDate || '—'}
                    </p>
                  </div>
                )}

                {paymentMode === 'recurring' && editingTransaction && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Esta transação foi gerada por uma recorrente. Para alterar a recorrência,
                      edite-a na página de Recorrentes.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 5. Detalhes */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Detalhes
              </span>

              <div>
                <label htmlFor="tx-description" className="text-xs font-semibold text-gray-700">
                  Descrição
                </label>
                <Input
                  id="tx-description"
                  placeholder={
                    type === 'income'
                      ? 'Salário'
                      : type === 'transfer'
                        ? 'Transferência entre contas'
                        : 'Supermercado'
                  }
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

              {type !== 'transfer' && (
                <div>
                  <label htmlFor="tx-category" className="text-xs font-semibold text-gray-700">
                    Categoria
                  </label>
                  {showSuggestedBadge && (
                    <Badge className="ml-2 bg-blue-100 text-blue-700 border-0 gap-1 text-[10px] align-middle">
                      <Sparkles className="h-2.5 w-2.5" /> Sugerido
                    </Badge>
                  )}
                  <div className="mt-1">
                    <CategoryPicker
                      categories={categories}
                      selectedId={categoryId}
                      onSelect={(id) => {
                        userTouchedCategory.current = true
                        setCategoryId(id)
                      }}
                      familyId={familyId}
                      type={type === 'income' ? 'income' : 'expense'}
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
              )}

              {type !== 'transfer' && (
                <div>
                  <span className="text-xs font-semibold text-gray-700">
                    Como você se sentiu com esta {typeLabel}?
                  </span>
                  <p className="text-[11px] text-gray-400 mb-2">Opcional</p>
                  <div
                    className={cn('grid gap-2', type === 'income' ? 'grid-cols-4' : 'grid-cols-3')}
                    role="group"
                    aria-label={`Emoção da ${typeLabel}`}
                  >
                    {emotions.map((e) => {
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
                    placeholder={`O que te motivou a ${typeAction}?`}
                    value={emotionNote}
                    onChange={(e) => setEmotionNote(e.target.value)}
                    maxLength={200}
                    rows={2}
                    className="mt-2 text-sm resize-none"
                    aria-label={`Nota sobre a emoção da ${typeLabel}`}
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5 text-right">
                    {emotionNote.length}/200
                  </p>
                </div>
              )}
            </div>

            {/* 6. Compartilhada com a família */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Compartilhada com a família</span>
              <Switch checked={isShared} onCheckedChange={setIsShared} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Conta fixa mensal</span>
              <Switch checked={isFixed} onCheckedChange={setIsFixed} />
            </div>
          </div>
        </div>
        {/* 7. Salvar — fixo no rodapé, sticky bottom */}
        <div className="sticky bottom-0 bg-white dark:bg-card border-t border-gray-100 dark:border-gray-800 pt-3 px-0 pb-1 shrink-0">
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              amount <= 0 ||
              !description ||
              (type === 'transfer' ? !accountId || !transferToAccountId : !categoryId)
            }
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : editingTransaction ? (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Salvar alterações
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
