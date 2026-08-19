import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
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
import type { DebtRecord, DebtType } from '@/types/finance'

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

// Helper para decimais (juros)
function sanitizeDecimal(raw: string): string {
  if (raw === '') return ''
  let s = raw.replace(/[^\d.,]/g, '')
  if (s === '') return ''
  // troca vírgula por ponto
  s = s.replace(',', '.')
  // mantém só o último ponto
  const parts = s.split('.')
  if (parts.length > 2) {
    s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
  }
  return s
}

// Calcula data de fim: start_date + installments_total meses (mesmo dia)
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
    type: z.enum(['financing_home', 'financing_car', 'personal_loan', 'credit_card', 'other']),
    description: z.string().min(2, 'Descrição muito curta').max(100),
    total_amount: z.number().positive('Valor deve ser maior que zero'),
    remaining_amount: z.number().positive('Valor deve ser maior que zero'),
    installment_value: z.number().positive('Valor deve ser maior que zero'),
    installments_total: z.number().int().min(1, 'Mínimo 1 parcela'),
    installments_paid: z.number().int().min(0),
    interest_rate: z.number().positive('Taxa deve ser positiva'),
    due_day: z.number().int().min(1).max(31),
    start_date: z.string().min(1, 'Selecione uma data'),
  })
  .refine((d) => d.remaining_amount <= d.total_amount, {
    message: 'Restante > total',
    path: ['remaining_amount'],
  })
  .refine((d) => d.installments_paid <= d.installments_total, {
    message: 'Pagas > total',
    path: ['installments_paid'],
  })

interface DebtPrefill {
  description?: string
  totalAmount?: number
  remainingAmount?: number
  installmentValue?: number
  installmentsTotal?: number
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
  const [type, setType] = useState<DebtType>('financing_home')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [installmentValue, setInstallmentValue] = useState(0)
  const [installmentsTotal, setInstallmentsTotal] = useState(1)
  const [installmentsPaid, setInstallmentsPaid] = useState(0)
  const [interestRate, setInterestRate] = useState('')
  const [dueDay, setDueDay] = useState(1)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  // strings controladas para inputs numéricos (evita bug do zero travado)
  const [installmentsTotalStr, setInstallmentsTotalStr] = useState('1')
  const [installmentsPaidStr, setInstallmentsPaidStr] = useState('0')
  const [interestRateStr, setInterestRateStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Geração de despesa no fluxo de caixa (auto_create_transaction)
  const [generateExpense, setGenerateExpense] = useState(true)
  const [expenseCategory, setExpenseCategory] = useState<string>('')

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  )

  useEffect(() => {
    if (open) {
      if (editingDebt) {
        setType(editingDebt.type)
        setDescription(editingDebt.description)
        setTotalAmount(editingDebt.total_amount)
        setRemainingAmount(editingDebt.remaining_amount)
        setInstallmentValue(editingDebt.installment_value)
        setInstallmentsTotal(editingDebt.installments_total)
        setInstallmentsTotalStr(String(editingDebt.installments_total))
        setInstallmentsPaid(editingDebt.installments_paid)
        setInstallmentsPaidStr(String(editingDebt.installments_paid))
        setInterestRate(String(editingDebt.interest_rate))
        setInterestRateStr(String(editingDebt.interest_rate))
        setDueDay(editingDebt.due_day)
        setStartDate(editingDebt.start_date.split(' ')[0].split('T')[0])
        setNotes(editingDebt.notes || '')
        setGenerateExpense(!!editingDebt.auto_create_transaction)
        setExpenseCategory('')
      } else {
        setType('financing_home')
        setDescription(prefill?.description || '')
        setTotalAmount(prefill?.totalAmount ?? 0)
        setRemainingAmount(prefill?.remainingAmount ?? prefill?.totalAmount ?? 0)
        setInstallmentValue(prefill?.installmentValue ?? 0)
        setInstallmentsTotal(prefill?.installmentsTotal ?? 1)
        setInstallmentsTotalStr(String(prefill?.installmentsTotal ?? 1))
        setInstallmentsPaid(0)
        setInstallmentsPaidStr('0')
        setInterestRate('')
        setInterestRateStr('')
        setDueDay(1)
        setStartDate(new Date().toISOString().split('T')[0])
        setNotes(prefill?.notes || '')
        // Nova dívida: toggle ON por padrão
        setGenerateExpense(true)
        setExpenseCategory('')
      }
      setErrors({})
    }
  }, [open, editingDebt, prefill])

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

  // Handlers para inputs numéricos controlados (texto + inputMode numeric)
  const handleInstallmentsTotalChange = (raw: string) => {
    const s = sanitizeInt(raw)
    setInstallmentsTotalStr(s)
    setInstallmentsTotal(s === '' ? 0 : parseInt(s, 10))
  }
  const handleInstallmentsPaidChange = (raw: string) => {
    const s = sanitizeInt(raw)
    setInstallmentsPaidStr(s)
    setInstallmentsPaid(s === '' ? 0 : parseInt(s, 10))
  }
  const handleInterestRateChange = (raw: string) => {
    const s = sanitizeDecimal(raw)
    setInterestRateStr(s)
    setInterestRate(s)
  }

  // Cálculo automático de data de fim (mesmo dia, +installments_total meses)
  const endDateStr = useMemo(
    () => calcEndDate(startDate, installmentsTotal),
    [startDate, installmentsTotal],
  )
  // Resumo automático de total
  const totalSummary = useMemo(() => {
    if (installmentsTotal > 0 && installmentValue > 0) {
      return installmentsTotal * installmentValue
    }
    return 0
  }, [installmentsTotal, installmentValue])

  const handleSave = async () => {
    const result = schema.safeParse({
      type,
      description,
      total_amount: totalAmount,
      remaining_amount: remainingAmount,
      installment_value: installmentValue,
      installments_total: installmentsTotal,
      installments_paid: installmentsPaid,
      interest_rate: interestRate ? Number(interestRate) : 0,
      due_day: dueDay,
      start_date: startDate,
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
        description,
        total_amount: totalAmount,
        remaining_amount: remainingAmount,
        installment_value: installmentValue,
        installments_total: installmentsTotal,
        installments_paid: installmentsPaid,
        installments_remaining: installmentsTotal - installmentsPaid,
        interest_rate: Number(interestRate),
        due_day: dueDay,
        start_date: new Date(startDate + 'T12:00:00').toISOString(),
        is_active: true,
        notes: notes || null,
        auto_create_transaction: generateExpense,
        category_id: generateExpense && expenseCategory ? expenseCategory : null,
        frequency: 'monthly' as const,
        end_date: endDateStr ? new Date(endDateStr + 'T12:00:00').toISOString() : null,
      }
      if (editingDebt) {
        await updateDebt(editingDebt.id, data)
        toast({ title: 'Dívida atualizada' })
      } else {
        await createDebt(data)
        toast({
          title: generateExpense
            ? 'Dívida cadastrada — despesas mensais automáticas ativadas'
            : 'Dívida cadastrada',
        })
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
          <SheetTitle>{editingDebt ? 'Editar Dívida' : 'Nova Dívida'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
              <SelectTrigger>
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
          <div>
            <Label className="text-xs font-semibold text-gray-700">Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Valor total</Label>
              <CurrencyInput
                value={totalAmount}
                onChange={(v) => {
                  setTotalAmount(v)
                  if (!editingDebt) setRemainingAmount(v)
                }}
                error={errors.total_amount}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Valor restante</Label>
              <CurrencyInput
                value={remainingAmount}
                onChange={setRemainingAmount}
                error={errors.remaining_amount}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Valor da parcela</Label>
            <CurrencyInput
              value={installmentValue}
              onChange={setInstallmentValue}
              error={errors.installment_value}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Total de parcelas</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={installmentsTotalStr}
                onChange={(e) => handleInstallmentsTotalChange(e.target.value)}
                placeholder="Ex: 24"
                className={errors.installments_total ? 'border-red-500' : ''}
              />
              {errors.installments_total && (
                <p className="text-xs text-red-500 mt-1">{errors.installments_total}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Parcelas pagas</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={installmentsPaidStr}
                onChange={(e) => handleInstallmentsPaidChange(e.target.value)}
                placeholder="Ex: 0"
                className={errors.installments_paid ? 'border-red-500' : ''}
              />
              {errors.installments_paid && (
                <p className="text-xs text-red-500 mt-1">{errors.installments_paid}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Juros a.m. (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={interestRateStr}
                onChange={(e) => handleInterestRateChange(e.target.value)}
                placeholder="Ex: 1.5"
                className={errors.interest_rate ? 'border-red-500' : ''}
              />
              {errors.interest_rate && (
                <p className="text-xs text-red-500 mt-1">{errors.interest_rate}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Dia de vencimento</Label>
              <Select value={String(dueDay)} onValueChange={(v) => setDueDay(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Data de início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={errors.start_date ? 'border-red-500' : ''}
            />
            {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
          </div>

          {/* Cálculo automático de término */}
          {endDateStr && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
              <p className="text-xs font-medium text-blue-800">
                Término estimado: {formatDateDDMMYYYY(endDateStr)}
              </p>
            </div>
          )}

          {/* Resumo automático */}
          {installmentsTotal > 0 && installmentValue > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <p className="text-sm font-semibold text-emerald-800">
                {installmentsTotal}x de {formatBRL(installmentValue)} = {formatBRL(totalSummary)}{' '}
                total
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-gray-700">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Geração de despesa no fluxo de caixa */}
          <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50/60">
            <div className="flex items-center justify-between">
              <div className="pr-2">
                <p className="text-sm font-semibold text-gray-800">
                  Gerar despesa no fluxo de caixa
                </p>
                <p className="text-xs text-gray-500">
                  Gera automaticamente uma despesa mensal (parcela) no fluxo de caixa.
                </p>
              </div>
              <Switch checked={generateExpense} onCheckedChange={setGenerateExpense} />
            </div>

            {generateExpense && (
              <div>
                <Label className="text-xs font-semibold text-gray-700">Categoria</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger>
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

          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !description ||
              totalAmount <= 0 ||
              remainingAmount <= 0 ||
              installmentValue <= 0
            }
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
