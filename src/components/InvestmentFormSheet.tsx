import { useState, useEffect } from 'react'
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
import { investmentTypeMeta, interestTypeLabels } from '@/lib/patrimony-icons'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type { InvestmentRecord, InvestmentType, InterestType } from '@/types/finance'

const schema = z.object({
  type: z.enum(['cdb', 'tesouro', 'acoes', 'fii', 'poupanca', 'renda_fixa', 'cripto', 'outro']),
  name: z.string().min(2, 'Nome muito curto').max(100),
  institution: z.string().min(2, 'Instituição muito curta').max(100),
  amount_invested: z.number().positive('Valor deve ser maior que zero'),
  current_value: z.number().positive('Valor deve ser maior que zero'),
  interest_rate: z.number().min(0).optional(),
  interest_type: z.enum(['cdi', 'fixed', 'ipca', 'prefixed']).optional(),
  maturity_date: z.string().optional(),
  notes: z.string().optional(),
})

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
      }
      setErrors({})
    }
  }, [open, editingInvestment])

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
    setSaving(true)
    try {
      const data = {
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
      }
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, data)
        toast({ title: 'Investimento atualizado' })
      } else {
        await createInvestment(data)
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
