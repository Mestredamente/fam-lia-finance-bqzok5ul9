import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
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
import { createCreditCard, updateCreditCard } from '@/services/credit-cards'
import { getMembersByFamilyId } from '@/services/members'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type { MemberRecord, CreditCardRecord } from '@/types/finance'

const BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Outros']
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(50),
  card_brand: z.enum(['Visa', 'Mastercard', 'Elo', 'Amex', 'Outros']),
  owner_id: z.string().min(1, 'Selecione um titular'),
  closing_day: z.number().min(1).max(31),
  due_day: z.number().min(1).max(31),
  credit_limit: z.number().min(0),
  is_active: z.boolean(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  defaultOwnerId: string
  editingCard?: CreditCardRecord | null
  onSaved?: () => void
}

export function CreditCardFormSheet({
  open,
  onOpenChange,
  familyId,
  defaultOwnerId,
  editingCard,
  onSaved,
}: Props) {
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('Visa')
  const [ownerId, setOwnerId] = useState('')
  const [closingDay, setClosingDay] = useState(1)
  const [dueDay, setDueDay] = useState(10)
  const [creditLimit, setCreditLimit] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (familyId)
      getMembersByFamilyId(familyId)
        .then(setMembers)
        .catch(() => {})
  }, [familyId])

  useEffect(() => {
    if (open) {
      if (editingCard) {
        setName(editingCard.name)
        setBrand(editingCard.card_brand)
        setOwnerId(editingCard.owner_id)
        setClosingDay(editingCard.closing_day)
        setDueDay(editingCard.due_day)
        setCreditLimit(editingCard.credit_limit || 0)
        setIsActive(editingCard.is_active)
      } else {
        setName('')
        setBrand('Visa')
        setOwnerId(defaultOwnerId)
        setClosingDay(1)
        setDueDay(10)
        setCreditLimit(0)
        setIsActive(true)
      }
      setErrors({})
    }
  }, [open, editingCard, defaultOwnerId])

  const handleSave = async () => {
    const result = schema.safeParse({
      name,
      card_brand: brand,
      owner_id: ownerId,
      closing_day: closingDay,
      due_day: dueDay,
      credit_limit: creditLimit,
      is_active: isActive,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        if (i.path[0]) errs[String(i.path[0])] = i.message
      })
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const data = {
        family_id: familyId,
        name,
        card_brand: brand as 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Outros',
        owner_id: ownerId,
        closing_day: closingDay,
        due_day: dueDay,
        credit_limit: creditLimit || null,
        is_active: isActive,
      }
      if (editingCard) {
        await updateCreditCard(editingCard.id, data)
        toast({ title: 'Cartão atualizado' })
      } else {
        await createCreditCard(data)
        toast({ title: 'Cartão cadastrado' })
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
          <SheetTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Nome do cartão</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank"
              maxLength={50}
              className={cn(errors.name && 'border-red-500')}
            />
            {errors.name && (
              <p role="alert" aria-live="assertive" className="text-xs text-red-500 mt-1">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Bandeira</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Titular</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.owner_id && (
              <p role="alert" aria-live="assertive" className="text-xs text-red-500 mt-1">
                {errors.owner_id}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Dia de fechamento</Label>
              <Select value={String(closingDay)} onValueChange={(v) => setClosingDay(Number(v))}>
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
            <Label className="text-xs font-semibold text-gray-700">
              Limite de crédito (opcional)
            </Label>
            <CurrencyInput value={creditLimit} onChange={setCreditLimit} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Cartão ativo</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !name || !ownerId}
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
