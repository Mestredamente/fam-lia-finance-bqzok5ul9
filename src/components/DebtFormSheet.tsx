import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { createDebt, updateDebt } from '@/services/debts'
import { debtFormTypes } from '@/lib/patrimony-icons'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type { DebtRecord, DebtType } from '@/types/finance'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  ownerId: string
  editingDebt?: DebtRecord | null
  onSaved?: () => void
}

export function DebtFormSheet({
  open,
  onOpenChange,
  familyId,
  ownerId,
  editingDebt,
  onSaved,
}: Props) {
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
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (editingDebt) {
        setType(editingDebt.type)
        setDescription(editingDebt.description)
        setTotalAmount(editingDebt.total_amount)
        setRemainingAmount(editingDebt.remaining_amount)
        setInstallmentValue(editingDebt.installment_value)
        setInstallmentsTotal(editingDebt.installments_total)
        setInstallmentsPaid(editingDebt.installments_paid)
        setInterestRate(String(editingDebt.interest_rate))
        setDueDay(editingDebt.due_day)
        setStartDate(editingDebt.start_date.split(' ')[0].split('T')[0])
        setNotes(editingDebt.notes || '')
      } else {
        setType('financing_home')
        setDescription('')
        setTotalAmount(0)
        setRemainingAmount(0)
        setInstallmentValue(0)
        setInstallmentsTotal(1)
        setInstallmentsPaid(0)
        setInterestRate('')
        setDueDay(1)
        setStartDate(new Date().toISOString().split('T')[0])
        setNotes('')
      }
      setErrors({})
    }
  }, [open, editingDebt])

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
      }
      if (editingDebt) {
        await updateDebt(editingDebt.id, data)
        toast({ title: 'Dívida atualizada' })
      } else {
        await createDebt(data)
        toast({ title: 'Dívida cadastrada' })
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
                type="number"
                min={1}
                value={installmentsTotal}
                onChange={(e) => setInstallmentsTotal(Number(e.target.value))}
                className={errors.installments_total ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Parcelas pagas</Label>
              <Input
                type="number"
                min={0}
                value={installmentsPaid}
                onChange={(e) => setInstallmentsPaid(Number(e.target.value))}
                className={errors.installments_paid ? 'border-red-500' : ''}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Juros a.m. (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
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
          <div>
            <Label className="text-xs font-semibold text-gray-700">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
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
