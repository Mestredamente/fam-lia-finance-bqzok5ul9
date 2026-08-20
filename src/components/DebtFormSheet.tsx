import { useState, useEffect, useMemo } from 'react'
import { Loader2, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/CurrencyInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDebt, updateDebt } from '@/services/debts'
import { debtFormTypes } from '@/lib/patrimony-icons'
import { useCategories } from '@/hooks/use-categories'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn, formatBRL } from '@/lib/utils'
import { DDCImportSheet } from '@/components/DDCImportSheet'
import type { DDCParsedData } from '@/services/ddc'
import type { DebtRecord, DebtType, AmortizationSystem } from '@/types/finance'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// Helper para inputs numéricos controlados como texto (sem travar no zero)
function sanitizeInt(raw: string): string {
  if (raw === '') return ''
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const n = parseInt(digits, 10)
  if (isNaN(n)) return ''
  return String(n)
}

// Helper para decimais (juros / porcentagens)
function sanitizeDecimal(raw: string): string {
  if (raw === '') return ''
  let s = raw.replace(/[^\d.,]/g, '')
  if (s === '') return ''
  s = s.replace(',', '.')
  const parts = s.split('.')
  if (parts.length > 2) {
    s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
  }
  return s
}

// Calcula data de fim (último vencimento): startDate + installments_total meses (mesmo dia)
function calcEndDate(startDateStr: string, total: number): string | null {
  if (!startDateStr || !total || total <= 0) return null
  const d = new Date(startDateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return null
  const day = d.getDate()
  const month = d.getMonth()
  const year = d.getFullYear()
  const totalMonth = month + total
  const endYear = year + Math.floor(totalMonth / 12)
  const endMonth = totalMonth % 12
  const lastDay = new Date(endYear, endMonth + 1, 0).getDate()
  const endDay = Math.min(day, lastDay)
  const end = new Date(endYear, endMonth, endDay, 12, 0, 0)
  return end.toISOString().split('T')[0]
}

function formatDateDDMMYYYY(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const schema = z
  .object({
    type: z.enum([
      'financing',
      'loan',
      'credit_card',
      'financing_home',
      'financing_car',
      'personal_loan',
      'utility',
      'subscription',
      'rent',
      'condo',
      'other',
    ]),
    description: z.string().min(2, 'Descrição muito curta').max(100),
    installment_value: z.number().positive('Valor da parcela deve ser maior que zero'),
    installments_total: z.number().int().min(1, 'Mínimo 1 parcela'),
    installments_paid: z.number().int().min(0, 'Não pode ser negativo'),
    total_amount: z.number().positive('Total deve ser maior que zero'),
    remaining_amount: z.number().positive('Restante a pagar deve ser maior que zero'),
    balance_due: z.number().positive('Saldo devedor deve ser maior que zero').optional().nullable(),
    interest_rate: z.number().min(0, 'Taxa não pode ser negativa'),
    cet: z.number().min(0, 'CET não pode ser negativo').optional().nullable(),
    financed_amount: z
      .number()
      .positive('Valor financiado deve ser maior que zero')
      .optional()
      .nullable(),
    amortization_system: z.enum(['PRICE', 'SAC', 'Livre']).optional().nullable(),
    due_day: z.number().int().min(1).max(31),
    start_date: z.string().min(1, 'Selecione uma data'),
  })
  .refine((d) => d.installments_paid <= d.installments_total, {
    message: 'Parcelas pagas não podem superar o total',
    path: ['installments_paid'],
  })

interface DebtPrefill {
  type?: DebtType
  description?: string
  totalAmount?: number
  remainingAmount?: number
  installmentValue?: number
  installmentsTotal?: number
  installmentsPaid?: number
  balanceDue?: number
  notes?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  ownerId: string
  editingDebt?: DebtRecord | null
  prefill?: DebtPrefill | null
  onSaved?: () => void
}

export function DebtFormSheet({
  open,
  onOpenChange,
  familyId,
  ownerId,
  editingDebt,
  prefill,
  onSaved,
}: Props) {
  const { categories } = useCategories(familyId)

  // Campos básicos
  const [type, setType] = useState<DebtType>('financing_home')
  const [description, setDescription] = useState('')

  // Valores
  const [installmentValue, setInstallmentValue] = useState<number>(0)
  const [installmentsTotalStr, setInstallmentsTotalStr] = useState<string>('')
  const [installmentsPaidStr, setInstallmentsPaidStr] = useState<string>('0')
  const [balanceDue, setBalanceDue] = useState<number>(0)

  // Detalhes Financeiros (Avançado)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [amortizationSystem, setAmortizationSystem] = useState<AmortizationSystem>('PRICE')
  const [interestRateStr, setInterestRateStr] = useState('')
  const [cetStr, setCetStr] = useState('')
  const [financedAmount, setFinancedAmount] = useState<number>(0)

  // Pagamento
  const [dueDay, setDueDay] = useState<number>(new Date().getDate())
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Geração de despesa no fluxo de caixa (auto_create_transaction)
  const [generateExpense, setGenerateExpense] = useState(true)
  const [expenseCategory, setExpenseCategory] = useState<string>('')

  // DDC Import state
  const [showDDCImport, setShowDDCImport] = useState(false)
  const [importedFromDDC, setImportedFromDDC] = useState(false)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  )

  useEffect(() => {
    if (open) {
      if (editingDebt) {
        setType(editingDebt.type)
        setDescription(editingDebt.description || '')
        setInstallmentValue(editingDebt.installment_value || 0)
        setInstallmentsTotalStr(
          editingDebt.installments_total ? String(editingDebt.installments_total) : '',
        )
        setInstallmentsPaidStr(
          editingDebt.installments_paid != null ? String(editingDebt.installments_paid) : '0',
        )
        setBalanceDue(editingDebt.balance_due || 0)
        setAmortizationSystem(editingDebt.amortization_system || 'PRICE')
        setInterestRateStr(
          editingDebt.interest_rate != null ? String(editingDebt.interest_rate) : '',
        )
        setCetStr(editingDebt.cet != null ? String(editingDebt.cet) : '')
        setFinancedAmount(editingDebt.financed_amount || 0)
        setDueDay(editingDebt.due_day || new Date().getDate())
        setStartDate(
          editingDebt.start_date
            ? editingDebt.start_date.split(' ')[0].split('T')[0]
            : new Date().toISOString().split('T')[0],
        )
        setNotes(editingDebt.notes || '')
        setGenerateExpense(!!editingDebt.auto_create_transaction)
        setExpenseCategory(editingDebt.category_id || '')
        if (editingDebt.amortization_system || editingDebt.cet || editingDebt.financed_amount) {
          setShowAdvanced(true)
        } else {
          setShowAdvanced(false)
        }
      } else {
        setType(prefill?.type || 'financing_home')
        setDescription(prefill?.description || '')
        setInstallmentValue(prefill?.installmentValue ?? 0)
        setInstallmentsTotalStr(
          prefill?.installmentsTotal ? String(prefill?.installmentsTotal) : '',
        )
        setInstallmentsPaidStr(
          prefill?.installmentsPaid != null ? String(prefill?.installmentsPaid) : '0',
        )
        setBalanceDue(prefill?.balanceDue ?? 0)
        setAmortizationSystem('PRICE')
        setInterestRateStr('')
        setCetStr('')
        setFinancedAmount(0)
        setDueDay(new Date().getDate())
        setStartDate(new Date().toISOString().split('T')[0])
        setNotes(prefill?.notes || '')
        setGenerateExpense(true)
        setExpenseCategory('')
        setShowAdvanced(false)
        setImportedFromDDC(false)
      }
      setErrors({})
    }
  }, [open, editingDebt, prefill])

  const handleDDCConfirm = (data: DDCParsedData) => {
    // Tipo sugerido: 'personal_loan' como padrão
    setType('personal_loan')

    // Descrição baseada em bank_name e amortization_system
    if (data.bank_name) {
      if (data.amortization_system) {
        setDescription(`Empréstimo ${data.bank_name} - ${data.amortization_system}`)
      } else {
        setDescription(`DDC ${data.bank_name}`)
      }
    } else {
      setDescription('DDC Importado')
    }

    if (data.installment_value != null) {
      setInstallmentValue(data.installment_value)
    }
    if (data.installments_total != null) {
      setInstallmentsTotalStr(String(data.installments_total))
    }
    setInstallmentsPaidStr(String(data.installments_paid || 0))
    if (data.balance_due != null) {
      setBalanceDue(data.balance_due)
    }
    if (data.amortization_system) {
      setAmortizationSystem(data.amortization_system)
    }
    if (data.interest_rate != null) {
      setInterestRateStr(String(data.interest_rate))
    }
    if (data.cet != null) {
      setCetStr(String(data.cet))
    }
    if (data.financed_amount != null) {
      setFinancedAmount(data.financed_amount)
    }
    if (data.due_day != null) {
      setDueDay(data.due_day)
    }
    if (data.first_due_date) {
      setStartDate(data.first_due_date)
    }

    // Abrir seção "Avançado" automaticamente
    setShowAdvanced(true)
    setImportedFromDDC(true)
    toast({
      title: 'Dados do DDC importados!',
      description: 'Revise os campos preenchidos e salve quando estiver pronto.',
    })
  }

  // Default de categoria: buscar "Parcelas" ou "Dívidas"
  useEffect(() => {
    if (!generateExpense) return
    if (expenseCategory) return
    if (expenseCategories.length === 0) return
    const found =
      expenseCategories.find((c) => c.name.toLowerCase() === 'parcelas') ||
      expenseCategories.find((c) => c.name.toLowerCase() === 'dívidas')
    if (found) setExpenseCategory(found.id)
  }, [generateExpense, expenseCategory, expenseCategories])

  // Conversões numéricas dos campos de texto
  const installmentsTotalNum = useMemo(() => {
    if (!installmentsTotalStr) return 0
    const n = parseInt(installmentsTotalStr, 10)
    return isNaN(n) ? 0 : n
  }, [installmentsTotalStr])

  const installmentsPaidNum = useMemo(() => {
    if (!installmentsPaidStr) return 0
    const n = parseInt(installmentsPaidStr, 10)
    return isNaN(n) ? 0 : n
  }, [installmentsPaidStr])

  // Auto-cálculos em tempo real
  const installmentsRemaining = useMemo(() => {
    if (installmentsTotalNum <= 0) return 0
    return Math.max(0, installmentsTotalNum - installmentsPaidNum)
  }, [installmentsTotalNum, installmentsPaidNum])

  const somaDasPrestacoes = useMemo(() => {
    return installmentValue * installmentsTotalNum
  }, [installmentValue, installmentsTotalNum])

  const jaPago = useMemo(() => {
    return installmentValue * installmentsPaidNum
  }, [installmentValue, installmentsPaidNum])

  const restanteAPagar = useMemo(() => {
    return installmentValue * installmentsRemaining
  }, [installmentValue, installmentsRemaining])

  // Handlers para inputs numéricos controlados
  const handleInstallmentsTotalChange = (raw: string) => {
    const s = sanitizeInt(raw)
    setInstallmentsTotalStr(s)
  }

  const handleInstallmentsPaidChange = (raw: string) => {
    const s = sanitizeInt(raw)
    setInstallmentsPaidStr(s)
  }

  const handleInterestRateChange = (raw: string) => {
    const s = sanitizeDecimal(raw)
    setInterestRateStr(s)
  }

  const handleCetChange = (raw: string) => {
    const s = sanitizeDecimal(raw)
    setCetStr(s)
  }

  // Cálculo de data de término (último vencimento)
  const endDateStr = useMemo(
    () => calcEndDate(startDate, installmentsTotalNum),
    [startDate, installmentsTotalNum],
  )

  const handleSave = async () => {
    const interestNum = interestRateStr ? Number(interestRateStr) : 0
    const cetNum = cetStr ? Number(cetStr) : null
    const financedNum = financedAmount > 0 ? financedAmount : null
    const balanceDueNum = balanceDue > 0 ? balanceDue : null

    // remaining_amount = restanteAPagar ou saldo devedor se preenchido
    // total_amount = somaDasPrestacoes
    const totalAmountValue = somaDasPrestacoes
    const remainingAmountValue = balanceDueNum && balanceDueNum > 0 ? balanceDueNum : restanteAPagar

    const validation = schema.safeParse({
      type,
      description,
      installment_value: installmentValue,
      installments_total: installmentsTotalNum,
      installments_paid: installmentsPaidNum,
      total_amount: totalAmountValue,
      remaining_amount: remainingAmountValue,
      balance_due: balanceDueNum,
      interest_rate: interestNum,
      cet: cetNum,
      financed_amount: financedNum,
      amortization_system: amortizationSystem,
      due_day: dueDay,
      start_date: startDate,
    })

    if (!validation.success) {
      const errs: Record<string, string> = {}
      validation.error.issues.forEach((i) => {
        if (i.path[0]) errs[String(i.path[0])] = i.message
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
        description: description.trim(),
        total_amount: totalAmountValue,
        remaining_amount: remainingAmountValue,
        installment_value: installmentValue,
        installments_total: installmentsTotalNum,
        installments_paid: installmentsPaidNum,
        installments_remaining: installmentsRemaining,
        balance_due: balanceDueNum,
        interest_rate: interestNum,
        cet: cetNum,
        financed_amount: financedNum,
        amortization_system: amortizationSystem,
        due_day: dueDay,
        start_date: new Date(startDate + 'T12:00:00').toISOString(),
        is_active: installmentsRemaining > 0,
        status: installmentsRemaining === 0 ? ('paid_off' as const) : ('active' as const),
        notes: notes.trim() || null,
        auto_create_transaction: generateExpense,
        category_id: generateExpense && expenseCategory ? expenseCategory : null,
        frequency: 'monthly' as const,
        end_date: endDateStr ? new Date(endDateStr + 'T12:00:00').toISOString() : null,
      }

      if (editingDebt) {
        await updateDebt(editingDebt.id, data)
        toast({ title: 'Dívida atualizada com sucesso' })
      } else {
        await createDebt(data)
        toast({
          title: generateExpense
            ? 'Dívida cadastrada — despesas mensais automáticas ativadas'
            : 'Dívida cadastrada com sucesso',
        })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: getPortugueseError(err),
      })
    } finally {
      setSaving(false)
    }
  }

  const isSaveDisabled =
    saving || !description.trim() || installmentValue <= 0 || installmentsTotalNum < 1

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold text-gray-900">
            {editingDebt ? 'Editar Dívida' : 'Nova Dívida'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Botão Importar DDC (apenas em modo criação e se ainda não importou DDC) */}
          {!editingDebt && !importedFromDDC && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-900">Possui o DDC do banco?</p>
                <p className="text-[11px] text-emerald-700">
                  Importe o PDF para preencher todos os campos automaticamente.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDDCImport(true)}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-300 shrink-0 text-xs font-semibold"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Importar DDC
              </Button>
            </div>
          )}

          {/* Identificação */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 block mb-2">Tipo de dívida</Label>
            <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
              <SelectTrigger className="h-10 px-3 py-2 rounded-md text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {debtFormTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 block mb-2">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Financiamento Imobiliário CAIXA"
              maxLength={100}
              className={cn(
                'h-10 px-3 py-2 rounded-md text-sm',
                errors.description && 'border-red-500',
              )}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* ── VALORES ── */}
          <div className="mt-6 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              ── VALORES ──
            </p>

            <div className="space-y-3">
              {/* a. Valor da parcela (full-width) */}
              <div>
                <Label className="text-xs font-semibold text-gray-700 block mb-2">
                  Valor da parcela
                </Label>
                <CurrencyInput
                  value={installmentValue}
                  onChange={setInstallmentValue}
                  emptyOnZero
                  placeholder="R$ 0,00"
                  error={errors.installment_value}
                  className="h-10 text-sm"
                />
              </div>

              {/* b. Total de parcelas e c. Parcelas já pagas (grid-cols-2) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 block mb-2">
                    Total de parcelas
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={installmentsTotalStr}
                    onChange={(e) => handleInstallmentsTotalChange(e.target.value)}
                    placeholder="0"
                    className={cn(
                      'h-10 px-3 py-2 rounded-md text-sm',
                      errors.installments_total && 'border-red-500',
                    )}
                  />
                  {errors.installments_total && (
                    <p className="text-xs text-red-500 mt-1">{errors.installments_total}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 block mb-2">
                    Parcelas já pagas
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={installmentsPaidStr}
                    onChange={(e) => handleInstallmentsPaidChange(e.target.value)}
                    placeholder="0"
                    className={cn(
                      'h-10 px-3 py-2 rounded-md text-sm',
                      errors.installments_paid && 'border-red-500',
                    )}
                  />
                  {errors.installments_paid && (
                    <p className="text-xs text-red-500 mt-1">{errors.installments_paid}</p>
                  )}
                </div>
              </div>

              {/* Cards auto-calculados: d, e, f, g */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <span className="text-[11px] font-medium text-gray-500 block">
                    Parcelas restantes
                  </span>
                  <span className="text-sm font-bold text-gray-900 block mt-0.5">
                    {installmentsRemaining}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <span className="text-[11px] font-medium text-gray-500 block">
                    Soma das prestações
                  </span>
                  <span className="text-sm font-bold text-gray-900 block mt-0.5 truncate">
                    {formatBRL(somaDasPrestacoes)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
                  <span className="text-[11px] font-medium text-emerald-700 block">Já pago</span>
                  <span className="text-sm font-bold text-emerald-800 block mt-0.5 truncate">
                    {formatBRL(jaPago)}
                  </span>
                </div>

                <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-lg">
                  <span className="text-[11px] font-medium text-rose-700 block">
                    Restante a pagar
                  </span>
                  <span className="text-sm font-bold text-rose-800 block mt-0.5 truncate">
                    {formatBRL(restanteAPagar)}
                  </span>
                </div>
              </div>

              {/* h. Saldo devedor (full-width, opcional) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold text-gray-700">
                    Saldo devedor para quitação
                  </Label>
                  <span className="text-[11px] text-gray-400">Opcional</span>
                </div>
                <CurrencyInput
                  value={balanceDue}
                  onChange={setBalanceDue}
                  emptyOnZero
                  placeholder="R$ 0,00"
                  error={errors.balance_due}
                  className="h-10 text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Valor para quitação antecipada fornecido pelo banco (se não informado, usa o
                  restante a pagar).
                </p>
              </div>
            </div>
          </div>

          {/* ── PAGAMENTO ── */}
          <div className="mt-6 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              ── PAGAMENTO ──
            </p>

            <div className="space-y-3">
              {/* m. Dia de vencimento e n. Primeiro vencimento */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-gray-700 block mb-2">
                    Dia de vencimento
                  </Label>
                  <Select value={String(dueDay)} onValueChange={(v) => setDueDay(Number(v))}>
                    <SelectTrigger className="h-10 px-3 py-2 rounded-md text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Dia {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700 block mb-2">
                    Primeiro vencimento
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={cn(
                      'h-10 px-3 py-2 rounded-md text-sm',
                      errors.start_date && 'border-red-500',
                    )}
                  />
                </div>
              </div>

              {/* o. Último vencimento (read-only, auto-calculado) */}
              {endDateStr && (
                <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-800">
                    Último vencimento estimado:
                  </span>
                  <span className="text-xs font-bold text-blue-900">
                    {formatDateDDMMYYYY(endDateStr)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── DETALHES FINANCEIROS (Avançado) ── */}
          <div className="mt-6 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full flex items-center justify-between py-1 text-left group"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-700">
                ── DETALHES FINANCEIROS ── {showAdvanced ? '(Avançado)' : '(Opcional)'}
              </p>
              <div className="text-gray-400 group-hover:text-gray-600">
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {showAdvanced && (
              <div className="space-y-3 mt-3 animate-in fade-in-50 duration-200">
                {/* i. Sistema de amortização */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 block mb-2">
                    Sistema de amortização
                  </Label>
                  <Select
                    value={amortizationSystem}
                    onValueChange={(v) => setAmortizationSystem(v as AmortizationSystem)}
                  >
                    <SelectTrigger className="h-10 px-3 py-2 rounded-md text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRICE">Tabela PRICE (Parcelas fixas)</SelectItem>
                      <SelectItem value="SAC">
                        SAC (Amortização constante / parcelas decrescentes)
                      </SelectItem>
                      <SelectItem value="Livre">Livre / Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* j. Taxa de juros e k. CET a.a. (grid-cols-2) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 block mb-2">
                      Taxa de juros a.m. (%)
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={interestRateStr}
                      onChange={(e) => handleInterestRateChange(e.target.value)}
                      placeholder="0,00%"
                      className={cn(
                        'h-10 px-3 py-2 rounded-md text-sm',
                        errors.interest_rate && 'border-red-500',
                      )}
                    />
                    {errors.interest_rate && (
                      <p className="text-xs text-red-500 mt-1">{errors.interest_rate}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 block mb-2">
                      CET a.a. (%)
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={cetStr}
                      onChange={(e) => handleCetChange(e.target.value)}
                      placeholder="0,00%"
                      className={cn(
                        'h-10 px-3 py-2 rounded-md text-sm',
                        errors.cet && 'border-red-500',
                      )}
                    />
                    {errors.cet && <p className="text-xs text-red-500 mt-1">{errors.cet}</p>}
                  </div>
                </div>

                {/* l. Valor financiado */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 block mb-2">
                    Valor financiado original
                  </Label>
                  <CurrencyInput
                    value={financedAmount}
                    onChange={setFinancedAmount}
                    emptyOnZero
                    placeholder="R$ 0,00"
                    error={errors.financed_amount}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700 block mb-2">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Número do contrato, agência, condições..."
              rows={2}
              maxLength={500}
              className="text-sm rounded-md px-3 py-2"
            />
          </div>

          {/* Geração de despesa no fluxo de caixa */}
          <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50/70">
            <div className="flex items-center justify-between gap-2">
              <div className="pr-2">
                <p className="text-sm font-semibold text-gray-800">
                  Gerar despesa no fluxo de caixa
                </p>
                <p className="text-xs text-gray-500">
                  Gera automaticamente a parcela mensal no fluxo de contas a pagar.
                </p>
              </div>
              <Switch checked={generateExpense} onCheckedChange={setGenerateExpense} />
            </div>

            {generateExpense && (
              <div>
                <Label className="text-xs font-semibold text-gray-700 block mb-2">
                  Categoria da despesa
                </Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger className="h-10 px-3 py-2 rounded-md text-sm bg-white">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Resumo verde no final com os 3 valores */}
          {installmentsTotalNum > 0 && installmentValue > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 space-y-1.5">
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Resumo do Contrato
              </p>
              <div className="text-xs text-emerald-800 space-y-1">
                <div className="flex justify-between">
                  <span>Total do contrato:</span>
                  <span className="font-semibold">{formatBRL(somaDasPrestacoes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Já pago:</span>
                  <span className="font-semibold">{formatBRL(jaPago)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200/70 pt-1 text-emerald-900">
                  <span className="font-bold">Restante:</span>
                  <span className="font-bold">{formatBRL(restanteAPagar)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Salvar */}
          <Button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="w-full h-11 bg-[#166534] hover:bg-[#15803D] font-semibold text-white rounded-lg mt-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar dívida'
            )}
          </Button>
        </div>

        <DDCImportSheet
          open={showDDCImport}
          onOpenChange={setShowDDCImport}
          familyId={familyId}
          onConfirm={handleDDCConfirm}
        />
      </SheetContent>
    </Sheet>
  )
}
