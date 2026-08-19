import { useState, useMemo, useEffect } from 'react'
import { CreditCard, Loader2, AlertTriangle, Info, Receipt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/CurrencyInput'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { formatBRL, cn } from '@/lib/utils'
import type { BillItem } from '@/types/finance'

type PaymentChoice = 'total' | 'minimum' | 'other'

interface Props {
  bill: BillItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  ownerId: string
  onPaid: () => void
}

function formatDatePtBR(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function monthRefLabel(monthRef?: string): string {
  if (!monthRef) return ''
  const refStr = monthRef.split(' ')[0]
  if (!refStr) return ''
  const d = new Date(refStr + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  return `${months[d.getMonth()]}/${d.getFullYear()}`
}

export function InvoicePaymentDialog({
  bill,
  open,
  onOpenChange,
  familyId,
  ownerId,
  onPaid,
}: Props) {
  const [choice, setChoice] = useState<PaymentChoice>('total')
  const [otherAmount, setOtherAmount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [confirmBelowMin, setConfirmBelowMin] = useState(false)

  const total = bill?.amount ?? 0
  const minimum = bill?.minimumPayment ?? Math.round(total * 0.15 * 100) / 100

  // Reset the form whenever a new bill is opened.
  useEffect(() => {
    if (open) {
      setChoice('total')
      setOtherAmount(0)
      setConfirmBelowMin(false)
    }
  }, [open, bill?.id])

  const chosenAmount = useMemo(() => {
    if (choice === 'total') return total
    if (choice === 'minimum') return minimum
    return otherAmount
  }, [choice, total, minimum, otherAmount])

  const isBelowMin = choice === 'other' && otherAmount > 0 && otherAmount < minimum
  const isPartial =
    choice === 'other' && otherAmount > 0 && otherAmount >= minimum && otherAmount < total
  const isAboveTotal = choice === 'other' && otherAmount > total
  const canConfirm = chosenAmount > 0 && (choice !== 'other' || otherAmount > 0)

  const handleConfirm = async () => {
    if (!bill || !bill.invoiceId) return

    // Below minimum: require an explicit confirm step first.
    if (isBelowMin && !confirmBelowMin) {
      setConfirmBelowMin(true)
      return
    }

    setSaving(true)
    try {
      const amount = chosenAmount
      const cardName = bill.cardName || 'Cartão'
      const refLabel = monthRefLabel(bill.monthRef)
      const invoiceId = bill.invoiceId
      const cardId = bill.cardId

      // Build the transaction record. source='invoice_import' so it shows up
      // in the Cartão filter; invoice_id + card_id link it back to the invoice.
      const txPayload: Record<string, unknown> = {
        family_id: familyId,
        owner_id: ownerId,
        type: 'expense' as const,
        amount,
        description:
          amount >= total
            ? `Fatura ${cardName} - ${refLabel}`
            : `Pagamento parcial fatura ${cardName} - ${refLabel}`,
        transaction_date: new Date().toISOString(),
        is_shared: false,
        is_fixed: false,
        status: 'paid',
        source: 'invoice_import',
        invoice_id: invoiceId,
        ...(cardId ? { card_id: cardId } : {}),
      }

      const invoiceUpdate: Record<string, unknown> = {}

      if (amount >= total) {
        // Full payment (or above-total abatement).
        invoiceUpdate.status = 'paid'
        invoiceUpdate.paid_at = new Date().toISOString()
        invoiceUpdate.partial_amount = null
      } else {
        // Partial payment (≥ minimum OR below minimum after confirm).
        invoiceUpdate.status = 'partial'
        invoiceUpdate.partial_amount = amount
        invoiceUpdate.paid_at = new Date().toISOString()
      }

      // 1. Create the transaction.
      await pb.collection('transactions').create(txPayload)

      // 2. Update the invoice.
      await pb.collection('invoices').update(invoiceId, invoiceUpdate)

      // 3. Toasts per the spec's branches.
      if (amount > total) {
        const diff = amount - total
        toast({
          title: 'Fatura paga com abatimento extra',
          description: `Crédito de ${formatBRL(diff)} disponível.`,
        })
      } else if (amount >= total) {
        toast({ title: 'Fatura paga integralmente' })
      } else if (isBelowMin) {
        toast({
          variant: 'destructive',
          title: 'Pagamento abaixo do mínimo',
          description: `Pode gerar juros de rotativo. Restante: ${formatBRL(total - amount)}.`,
        })
      } else {
        // Partial (≥ minimum, < total)
        const restante = total - amount
        toast({
          title: 'Pagamento parcial registrado',
          description: `Restante: ${formatBRL(restante)} (irá para rotativo com juros).`,
        })
      }

      onOpenChange(false)
      onPaid()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar pagamento',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
      setConfirmBelowMin(false)
    }
  }

  if (!bill) return null

  const cardName = bill.cardName || 'Cartão'
  const refLabel = monthRefLabel(bill.monthRef)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Pagamento de Fatura
          </DialogTitle>
          <DialogDescription asChild>
            <span className="block">
              Fatura: <strong className="text-gray-900 dark:text-foreground">{cardName}</strong> —{' '}
              {refLabel}
              <br />
              Vencimento: {formatDatePtBR(bill.dueDate)}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* QUANTO PAGAR? */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            Quanto pagar?
          </span>
          <RadioGroup
            value={choice}
            onValueChange={(v) => {
              setChoice(v as PaymentChoice)
              setConfirmBelowMin(false)
            }}
            className="gap-2"
          >
            <Label
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent',
                choice === 'total' && 'border-blue-500 bg-blue-50/50',
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="total" className="sr-only" />
                <span className="text-sm font-medium">Valor total</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-foreground">
                {formatBRL(total)}
              </span>
            </Label>

            <Label
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent',
                choice === 'minimum' && 'border-blue-500 bg-blue-50/50',
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="minimum" className="sr-only" />
                <span className="text-sm font-medium">Valor mínimo (15%)</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-foreground">
                {formatBRL(minimum)}
              </span>
            </Label>

            <Label
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent',
                choice === 'other' && 'border-blue-500 bg-blue-50/50',
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="other" className="sr-only" />
                <span className="text-sm font-medium">Outro valor</span>
              </div>
              <CurrencyInput
                value={otherAmount}
                onChange={(v) => {
                  setOtherAmount(v)
                  setConfirmBelowMin(false)
                }}
                placeholder="R$ 0,00"
                emptyOnZero
                className="max-w-[140px] h-8"
                aria-label="Outro valor"
              />
            </Label>
          </RadioGroup>

          {/* Validations / informational messages */}
          {isBelowMin && !confirmBelowMin && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Valor abaixo do mínimo (15%). Pode gerar juros de rotativo.</span>
            </div>
          )}
          {isPartial && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-2.5 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Pagamento parcial. O restante ({formatBRL(total - otherAmount)}) vai para o rotativo
                com juros. Considere parcelar.
              </span>
            </div>
          )}
          {isAboveTotal && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Pagamento acima do total. Crédito de {formatBRL(otherAmount - total)} disponível.
              </span>
            </div>
          )}

          {confirmBelowMin && (
            <div className="space-y-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-xs text-red-700 dark:text-red-300">
              <p className="font-semibold">Valor abaixo do mínimo permitido (15%).</p>
              <p>Isso pode gerar juros. Confirma o pagamento de {formatBRL(otherAmount)}?</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !canConfirm}
            className="bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : confirmBelowMin ? (
              'Confirmar pagamento'
            ) : (
              'Confirmar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
