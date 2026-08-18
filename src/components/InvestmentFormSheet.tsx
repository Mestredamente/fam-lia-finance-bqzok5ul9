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
import { createInvestment, updateInvestment } from '@/services/investments'
import { createTransaction } from '@/services/transactions'
import { createRecurringTransaction } from '@/services/recurring-transactions'
import { useCategories } from '@/hooks/use-categories'
import { investmentTypeMeta, interestTypeLabels } from '@/lib/patrimony-icons'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn, formatBRL } from '@/lib/utils'
import type { InvestmentRecord, InvestmentType, InterestType } from '@/types/finance'

const schema = z.object({
  type: z.enum([
    'cdb',
    'tesouro',
    'acoes',
    'fii',
    'poupanca',
    'renda_fixa',
    'cripto',
    'imovel',
    'terreno',
    'veiculo',
    'outro',
  ]),
  name: z.string().min(2, 'Nome muito curto').max(100),
  institution: z.string().min(2, 'Instituição muito curta').max(100),
  amount_invested: z.number().positive('Valor deve ser maior que zero'),
  current_value: z.number().positive('Valor deve ser maior que zero'),
  interest_rate: z.number().min(0).optional(),
  interest_type: z.enum(['cdi', 'fixed', 'ipca', 'prefixed']).optional(),
  maturity_date: z.string().optional(),
  notes: z.string().optional(),
})

const todayISO = () => new Date().toISOString().split('T')[0]
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// Sanitiza inteiros (sem travar no zero)
function sanitizeInt(raw: string): string {
  if (raw === '') return ''
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const n = parseInt(digits, 10)
  if (isNaN(n)) return ''
  return String(n)
}

// Calcula data de fim: start_date + installments_total × 30 dias
function calcInstallmentEndDate(startDateStr: string, total: number): string | null {
  if (!startDateStr || !total || total <= 0) return null
  const d = new Date(startDateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return null
  const end = new Date(d.getTime() + total * 30 * 24 * 60 * 60 * 1000)
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

const ASSET_TYPES: InvestmentType[] = ['imovel', 'terreno', 'veiculo']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  ownerId: string
  editingInvestment?: InvestmentRecord | null
  onSaved?: () => void
}

export function InvestmentFormSheet({
  open,
  onOpenChange,
  familyId,
  ownerId,
  editingInvestment,
  onSaved,
}: Props) {
  const { categories } = useCategories(familyId)
  const [type, setType] = useState<InvestmentType>('cdb')
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [amountInvested, setAmountInvested] = useState(0)
  const [currentValue, setCurrentValue] = useState(0)
  const [interestRate, setInterestRate] = useState('')
  const [interestType, setInterestType] = useState<InterestType | ''>('')
  const [maturityDate, setMaturityDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Novos campos
  const [downPayment, setDownPayment] = useState(0)
  const [parcelado, setParcelado] = useState(false)
  const [installmentsTotalStr, setInstallmentsTotalStr] = useState('')
  const [installmentsTotal, setInstallmentsTotal] = useState(0)
  const [installmentValue, setInstallmentValue] = useState(0)
  const [installmentDueDay, setInstallmentDueDay] = useState<number>(new Date().getDate())
  const [installmentStartDate, setInstallmentStartDate] = useState<string>(todayISO())

  const [recurringContribution, setRecurringContribution] = useState(false)
  const [contributionAmount, setContributionAmount] = useState(0)
  const [contributionDay, setContributionDay] = useState<number>(new Date().getDate())
  const [contributionStartDate, setContributionStartDate] = useState<string>(todayISO())
  const [noEndDate, setNoEndDate] = useState(true)
  const [contributionEndDate, setContributionEndDate] = useState<string>('')

  // Geração de despesa no fluxo de caixa
  const [generateExpense, setGenerateExpense] = useState(true)
  const [expenseCategory, setExpenseCategory] = useState<string>('')

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  )

  const isAssetType = ASSET_TYPES.includes(type)

  useEffect(() => {
    if (open) {
      if (editingInvestment) {
        setType(editingInvestment.type)
        setName(editingInvestment.name)
        setInstitution(editingInvestment.institution)
        setAmountInvested(editingInvestment.amount_invested)
        setCurrentValue(editingInvestment.current_value)
        setInterestRate(
          editingInvestment.interest_rate ? String(editingInvestment.interest_rate) : '',
        )
        setInterestType(editingInvestment.interest_type || '')
        setMaturityDate(
          editingInvestment.maturity_date
            ? editingInvestment.maturity_date.split(' ')[0].split('T')[0]
            : '',
        )
        setNotes(editingInvestment.notes || '')
        setDownPayment(editingInvestment.down_payment || 0)
        setParcelado(
          !!(editingInvestment.installments_total && editingInvestment.installments_total > 0),
        )
        setInstallmentsTotal(editingInvestment.installments_total || 0)
        setInstallmentsTotalStr(
          editingInvestment.installments_total ? String(editingInvestment.installments_total) : '',
        )
        setInstallmentValue(editingInvestment.installment_value || 0)
        setInstallmentDueDay(editingInvestment.contribution_day || new Date().getDate())
        setInstallmentStartDate(
          editingInvestment.contribution_start_date
            ? editingInvestment.contribution_start_date.split(' ')[0].split('T')[0]
            : todayISO(),
        )
        setRecurringContribution(!!editingInvestment.has_recurring_contribution)
        setContributionAmount(editingInvestment.contribution_amount || 0)
        setContributionDay(editingInvestment.contribution_day || new Date().getDate())
        setContributionStartDate(
          editingInvestment.contribution_start_date
            ? editingInvestment.contribution_start_date.split(' ')[0].split('T')[0]
            : todayISO(),
        )
        setNoEndDate(!editingInvestment.contribution_end_date)
        setContributionEndDate(
          editingInvestment.contribution_end_date
            ? editingInvestment.contribution_end_date.split(' ')[0].split('T')[0]
            : '',
        )
        // Edição: toggle OFF por padrão (não recriar despesa)
        setGenerateExpense(false)
        setExpenseCategory('')
      } else {
        setType('cdb')
        setName('')
        setInstitution('')
        setAmountInvested(0)
        setCurrentValue(0)
        setInterestRate('')
        setInterestType('')
        setMaturityDate('')
        setNotes('')
        setDownPayment(0)
        setParcelado(false)
        setInstallmentsTotal(0)
        setInstallmentsTotalStr('')
        setInstallmentValue(0)
        setInstallmentDueDay(new Date().getDate())
        setInstallmentStartDate(todayISO())
        setRecurringContribution(false)
        setContributionAmount(0)
        setContributionDay(new Date().getDate())
        setContributionStartDate(todayISO())
        setNoEndDate(true)
        setContributionEndDate('')
        // Novo: toggle ON por padrão
        setGenerateExpense(true)
        setExpenseCategory('')
      }
      setErrors({})
    }
  }, [open, editingInvestment])

  // Default de categoria: buscar "Investimentos" ou "Aportes"
  useEffect(() => {
    if (!generateExpense) return
    if (expenseCategory) return
    if (expenseCategories.length === 0) return
    const found =
      expenseCategories.find((c) => c.name.toLowerCase() === 'investimentos') ||
      expenseCategories.find((c) => c.name.toLowerCase() === 'aportes')
    if (found) setExpenseCategory(found.id)
  }, [generateExpense, expenseCategory, expenseCategories])

  // Exclusividade entre Parcelado e Aporte mensal
  const handleParceladoChange = (v: boolean) => {
    setParcelado(v)
    if (v) setRecurringContribution(false)
  }
  const handleRecurringChange = (v: boolean) => {
    setRecurringContribution(v)
    if (v) setParcelado(false)
  }

  const handleInstallmentsTotalChange = (raw: string) => {
    const s = sanitizeInt(raw)
    setInstallmentsTotalStr(s)
    setInstallmentsTotal(s === '' ? 0 : parseInt(s, 10))
  }

  // Cálculo de término do parcelado
  const installmentEndDate = useMemo(
    () => calcInstallmentEndDate(installmentStartDate, installmentsTotal),
    [installmentStartDate, installmentsTotal],
  )

  // Resumo do parcelado
  const parceladoSummary = useMemo(() => {
    const totalParcelas = installmentsTotal * installmentValue
    const entrada = downPayment > 0 ? downPayment : 0
    return entrada > 0 ? entrada + totalParcelas : totalParcelas
  }, [installmentsTotal, installmentValue, downPayment])

  // Número de aportes estimados (se data de fim definida)
  const contributionCount = useMemo(() => {
    if (noEndDate || !contributionStartDate || !contributionEndDate) return 0
    const start = new Date(contributionStartDate + 'T12:00:00')
    const end = new Date(contributionEndDate + 'T12:00:00')
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    return months > 0 ? months : 0
  }, [noEndDate, contributionStartDate, contributionEndDate])

  const handleSave = async () => {
    const result = schema.safeParse({
      type,
      name,
      institution,
      amount_invested: amountInvested,
      current_value: currentValue,
      interest_rate: interestRate ? Number(interestRate) : undefined,
      interest_type: interestType || undefined,
      maturity_date: maturityDate || undefined,
      notes: notes || undefined,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        errs[i.path[0]] = i.message
      })
      setErrors(errs)
      return
    }
    if (generateExpense && !expenseCategory) {
      setErrors((prev) => ({ ...prev, expenseCategory: 'Selecione uma categoria' }))
      return
    }
    // Validações de parcelado
    if (parcelado) {
      if (installmentsTotal < 2) {
        setErrors((prev) => ({ ...prev, installments_total: 'Mínimo 2 parcelas' }))
        return
      }
      if (installmentValue <= 0) {
        setErrors((prev) => ({ ...prev, installment_value: 'Informe o valor da parcela' }))
        return
      }
    }
    // Validações de aporte mensal
    if (recurringContribution) {
      if (contributionAmount <= 0) {
        setErrors((prev) => ({ ...prev, contribution_amount: 'Informe o valor do aporte' }))
        return
      }
    }
    setSaving(true)
    try {
      const data: Record<string, unknown> = {
        family_id: familyId,
        owner_id: ownerId,
        type,
        name,
        institution,
        amount_invested: amountInvested,
        current_value: currentValue,
        interest_rate: interestRate ? Number(interestRate) : null,
        interest_type: interestType || null,
        maturity_date: maturityDate ? new Date(maturityDate + 'T12:00:00').toISOString() : null,
        is_active: true,
        notes: notes || null,
        // Novos campos
        down_payment: isAssetType && downPayment > 0 ? downPayment : 0,
        installment_value: parcelado ? installmentValue : 0,
        installments_total: parcelado ? installmentsTotal : 0,
        installments_paid: parcelado ? 1 : 0,
        frequency: parcelado || recurringContribution ? 'monthly' : null,
        has_recurring_contribution: recurringContribution,
        contribution_amount: recurringContribution ? contributionAmount : 0,
        contribution_day: recurringContribution ? contributionDay : null,
        contribution_start_date: recurringContribution
          ? new Date(contributionStartDate + 'T12:00:00').toISOString()
          : null,
        contribution_end_date:
          recurringContribution && !noEndDate && contributionEndDate
            ? new Date(contributionEndDate + 'T12:00:00').toISOString()
            : null,
        generate_expense: generateExpense,
        expense_category_id: generateExpense && expenseCategory ? expenseCategory : null,
      }

      let createdId: string | undefined
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, data)
        createdId = editingInvestment.id
      } else {
        const created = await createInvestment(data as Partial<InvestmentRecord>)
        createdId = created.id
      }

      // Geração de despesa no fluxo de caixa (somente para novo investimento)
      let createdTransaction = false
      let createdRecurring = false
      if (generateExpense && !editingInvestment && createdId) {
        const txDate = new Date(installmentStartDate + 'T12:00:00').toISOString()
        if (parcelado) {
          // Parcelado: transação com amount = installment_value
          await createTransaction({
            family_id: familyId,
            owner_id: ownerId,
            category_id: expenseCategory,
            type: 'expense',
            amount: installmentValue,
            description: `Aporte: ${name} (parcela 1/${installmentsTotal})`,
            transaction_date: txDate,
            is_shared: false,
            is_fixed: false,
            source: 'investment',
            investment_id: createdId,
            status: 'pending',
            is_installment: true,
            installment_current: 1,
            installment_total: installmentsTotal,
          })
          createdTransaction = true
        } else if (recurringContribution) {
          // Aporte mensal: transação + recorrente com amount = contribution_amount
          await createTransaction({
            family_id: familyId,
            owner_id: ownerId,
            category_id: expenseCategory,
            type: 'expense',
            amount: contributionAmount,
            description: `Aporte: ${name}`,
            transaction_date: new Date(contributionStartDate + 'T12:00:00').toISOString(),
            is_shared: false,
            is_fixed: false,
            source: 'investment',
            investment_id: createdId,
            status: 'pending',
          })
          createdTransaction = true
          await createRecurringTransaction({
            family_id: familyId,
            member_id: ownerId,
            description: `Aporte: ${name}`,
            amount: contributionAmount,
            type: 'despesa',
            category_id: expenseCategory,
            frequency: 'monthly',
            day_of_month: contributionDay,
            start_date: contributionStartDate,
            end_date:
              !noEndDate && contributionEndDate
                ? new Date(contributionEndDate + 'T12:00:00').toISOString()
                : null,
            shared: false,
            active: true,
          })
          createdRecurring = true
        } else {
          // Comportamento atual: transação com amount = amount_invested
          await createTransaction({
            family_id: familyId,
            owner_id: ownerId,
            category_id: expenseCategory,
            type: 'expense',
            amount: amountInvested,
            description: `Aporte: ${name}`,
            transaction_date: txDate,
            is_shared: false,
            is_fixed: false,
            source: 'investment',
            investment_id: createdId,
            status: 'pending',
          })
          createdTransaction = true
        }
      }

      if (editingInvestment) {
        toast({ title: 'Investimento atualizado' })
      } else if (createdRecurring) {
        toast({ title: 'Investimento cadastrado com aporte mensal' })
      } else if (createdTransaction) {
        toast({ title: 'Investimento cadastrado e despesa registrada' })
      } else {
        toast({ title: 'Investimento cadastrado' })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSaving(false)
    }
  }

  const types = Object.entries(investmentTypeMeta) as [
    InvestmentType,
    (typeof investmentTypeMeta)[InvestmentType],
  ][]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Tipo</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {types.map(([value, meta]) => {
                const Icon = meta.icon
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all',
                      type === value ? 'border-[#22C55E] bg-emerald-50' : 'border-gray-200',
                    )}
                  >
                    <Icon className="h-5 w-5" style={{ color: meta.color }} />
                    <span className="text-xs font-medium text-gray-700">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Instituição</Label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={100}
              className={errors.institution ? 'border-red-500' : ''}
            />
            {errors.institution && (
              <p className="text-xs text-red-500 mt-1">{errors.institution}</p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Valor investido</Label>
            <CurrencyInput
              value={amountInvested}
              onChange={(v) => {
                setAmountInvested(v)
                if (!editingInvestment && currentValue === 0) setCurrentValue(v)
              }}
              error={errors.amount_invested}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Valor atual</Label>
            <CurrencyInput
              value={currentValue}
              onChange={setCurrentValue}
              error={errors.current_value}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Taxa (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Ex: 12.5"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Indexador</Label>
              <Select
                value={interestType}
                onValueChange={(v) => setInterestType(v as InterestType | '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(interestTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Vencimento (opcional)</Label>
            <Input
              type="date"
              value={maturityDate}
              onChange={(e) => setMaturityDate(e.target.value)}
            />
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

          {/* a) Valor de entrada (somente imovel/terreno/veiculo) */}
          {isAssetType && (
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Valor de entrada (opcional)
              </Label>
              <CurrencyInput value={downPayment} onChange={setDownPayment} />
            </div>
          )}

          {/* b) Toggle Parcelado */}
          <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50/60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Parcelado</p>
              <Switch checked={parcelado} onCheckedChange={handleParceladoChange} />
            </div>

            {parcelado && (
              <div className="space-y-3">
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
                    <Label className="text-xs font-semibold text-gray-700">Valor da parcela</Label>
                    <CurrencyInput
                      value={installmentValue}
                      onChange={setInstallmentValue}
                      error={errors.installment_value}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Dia de vencimento</Label>
                    <Select
                      value={String(installmentDueDay)}
                      onValueChange={(v) => setInstallmentDueDay(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            Dia {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Data de início</Label>
                    <Input
                      type="date"
                      value={installmentStartDate}
                      onChange={(e) => setInstallmentStartDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Término estimado */}
                {installmentEndDate && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                    <p className="text-xs font-medium text-blue-800">
                      Término estimado: {formatDateDDMMYYYY(installmentEndDate)}
                    </p>
                  </div>
                )}

                {/* Resumo em tempo real */}
                {installmentsTotal > 0 && installmentValue > 0 && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <p className="text-sm font-semibold text-emerald-800">
                      {downPayment > 0
                        ? `Entrada: ${formatBRL(downPayment)} + ${installmentsTotal}x de ${formatBRL(
                            installmentValue,
                          )} = ${formatBRL(parceladoSummary)} total`
                        : `${installmentsTotal}x de ${formatBRL(installmentValue)} = ${formatBRL(
                            parceladoSummary,
                          )} total`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* c) Toggle Aporte mensal recorrente (somente se Parcelado OFF) */}
          {!parcelado && (
            <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Aporte mensal recorrente</p>
                <Switch checked={recurringContribution} onCheckedChange={handleRecurringChange} />
              </div>

              {recurringContribution && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">
                      Valor do aporte mensal
                    </Label>
                    <CurrencyInput
                      value={contributionAmount}
                      onChange={setContributionAmount}
                      error={errors.contribution_amount}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Dia do mês</Label>
                      <Select
                        value={String(contributionDay)}
                        onValueChange={(v) => setContributionDay(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {DAYS.map((d) => (
                            <SelectItem key={d} value={String(d)}>
                              Dia {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Data de início</Label>
                      <Input
                        type="date"
                        value={contributionStartDate}
                        onChange={(e) => setContributionStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-700">Sem data de fim</Label>
                      <Switch checked={noEndDate} onCheckedChange={setNoEndDate} />
                    </div>
                    {!noEndDate && (
                      <div>
                        <Label className="text-xs font-semibold text-gray-700">Data de fim</Label>
                        <Input
                          type="date"
                          value={contributionEndDate}
                          onChange={(e) => setContributionEndDate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Cálculo do total estimado */}
                  {contributionCount > 0 && contributionAmount > 0 && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <p className="text-sm font-semibold text-emerald-800">
                        {contributionCount} aportes de {formatBRL(contributionAmount)} ={' '}
                        {formatBRL(contributionCount * contributionAmount)} total
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* d) Geração de despesa no fluxo de caixa */}
          {!editingInvestment && (
            <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50/60">
              <div className="flex items-center justify-between">
                <div className="pr-2">
                  <p className="text-sm font-semibold text-gray-800">
                    Gerar despesa no fluxo de caixa
                  </p>
                  <p className="text-xs text-gray-500">
                    {parcelado
                      ? 'Registra a 1ª parcela como despesa no mês atual.'
                      : recurringContribution
                        ? 'Registra o 1º aporte e cria recorrência mensal.'
                        : 'Registra o aporte como despesa no mês atual.'}
                  </p>
                </div>
                <Switch checked={generateExpense} onCheckedChange={setGenerateExpense} />
              </div>

              {generateExpense && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Categoria</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                      <SelectTrigger className={errors.expenseCategory ? 'border-red-500' : ''}>
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
                    {errors.expenseCategory && (
                      <p className="text-xs text-red-500 mt-1">{errors.expenseCategory}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !name || !institution || amountInvested <= 0 || currentValue <= 0}
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
