import { useState, useMemo, useEffect } from 'react'
import { CreditCard, Loader2, AlertTriangle, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CurrencyInput } from '@/components/CurrencyInput'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { formatBRL, cn } from '@/lib/utils'
import type { BillItem, InvoiceRecord } from '@/types/finance'

export type PaymentChoice = 'total' | 'minimum' | 'other'

export interface InvoicePaymentModalProps {
  /** Invoice object (can be a BillItem or a raw InvoiceRecord) */
  invoice?: InvoiceRecord | BillItem | null
  /** Alias bill prop for backward compatibility */
  bill?: BillItem | null
  cardName?: string
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  familyId?: string
  ownerId?: string
  onPaid?: () => void
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
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  return `${months[d.getMonth()]}/${d.getFullYear()}`
}

function monthRefShort(monthRef?: string): string {
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
  invoice: invoiceProp,
  bill: billProp,
  cardName: cardNameProp,
  isOpen,
  open: openProp,
  onClose,
  onOpenChange,
  familyId: familyIdProp,
  ownerId: ownerIdProp,
  onPaid,
}: InvoicePaymentModalProps) {
  const isModalOpen = openProp !== undefined ? openProp : isOpen !== undefined ? isOpen : false
  const effectiveInvoice = invoiceProp || billProp || null

  const [choice, setChoice] = useState<PaymentChoice>('total')
  const [otherAmount, setOtherAmount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showBelowMinConfirm, setShowBelowMinConfirm] = useState(false)

  // Extract total, minimum payment, card info, invoice id from the unified object.
  const total = useMemo(() => {
    if (!effectiveInvoice) return 0
    if ('amount' in effectiveInvoice && typeof effectiveInvoice.amount === 'number') {
      return effectiveInvoice.amount
    }
    if ('total_amount' in effectiveInvoice && typeof effectiveInvoice.total_amount === 'number') {
      return effectiveInvoice.total_amount
    }
    return 0
  }, [effectiveInvoice])

  const minimum = useMemo(() => {
    if (
      effectiveInvoice &&
      'minimumPayment' in effectiveInvoice &&
      typeof effectiveInvoice.minimumPayment === 'number'
    ) {
      return effectiveInvoice.minimumPayment
    }
    return Math.round(total * 0.15 * 100) / 100
  }, [effectiveInvoice, total])

  const resolvedCardName = useMemo(() => {
    if (cardNameProp) return cardNameProp
    if (effectiveInvoice) {
      if ('cardName' in effectiveInvoice && effectiveInvoice.cardName) {
        return effectiveInvoice.cardName
      }
      if ('expand' in effectiveInvoice && effectiveInvoice.expand?.card_id?.name) {
        return effectiveInvoice.expand.card_id.name
      }
    }
    return 'Cartão'
  }, [cardNameProp, effectiveInvoice])

  const monthRef = useMemo(() => {
    if (!effectiveInvoice) return undefined
    if ('monthRef' in effectiveInvoice && effectiveInvoice.monthRef) {
      return effectiveInvoice.monthRef
    }
    if ('month_ref' in effectiveInvoice && effectiveInvoice.month_ref) {
      return effectiveInvoice.month_ref
    }
    return undefined
  }, [effectiveInvoice])

  const dueDateStr = useMemo(() => {
    if (!effectiveInvoice) return ''
    if ('dueDate' in effectiveInvoice && effectiveInvoice.dueDate) {
      return formatDatePtBR(effectiveInvoice.dueDate)
    }
    if (monthRef) {
      const cardDueDay =
        'expand' in effectiveInvoice && effectiveInvoice.expand?.card_id?.due_day
          ? effectiveInvoice.expand.card_id.due_day
          : undefined
      const refStr = monthRef.split(' ')[0]
      if (refStr) {
        const d = new Date(refStr + 'T12:00:00')
        if (!isNaN(d.getTime())) {
          const day = cardDueDay && cardDueDay >= 1 && cardDueDay <= 31 ? cardDueDay : d.getDate()
          const due = new Date(d.getFullYear(), d.getMonth(), day, 12, 0, 0, 0)
          return formatDatePtBR(due.toISOString())
        }
      }
    }
    return '—'
  }, [effectiveInvoice, monthRef])

  const invoiceId = useMemo(() => {
    if (!effectiveInvoice) return ''
    if ('invoiceId' in effectiveInvoice && effectiveInvoice.invoiceId) {
      return effectiveInvoice.invoiceId
    }
    if ('id' in effectiveInvoice && effectiveInvoice.id) {
      return effectiveInvoice.id.startsWith('invoice-')
        ? effectiveInvoice.id.replace('invoice-', '')
        : effectiveInvoice.id
    }
    return ''
  }, [effectiveInvoice])

  const cardId = useMemo(() => {
    if (!effectiveInvoice) return undefined
    if ('cardId' in effectiveInvoice && effectiveInvoice.cardId) {
      return effectiveInvoice.cardId
    }
    if ('card_id' in effectiveInvoice && effectiveInvoice.card_id) {
      return effectiveInvoice.card_id
    }
    return undefined
  }, [effectiveInvoice])

  const resolvedFamilyId = useMemo(() => {
    if (familyIdProp) return familyIdProp
    if (effectiveInvoice && 'family_id' in effectiveInvoice && effectiveInvoice.family_id) {
      return effectiveInvoice.family_id
    }
    return ''
  }, [familyIdProp, effectiveInvoice])

  const resolvedOwnerId = useMemo(() => {
    if (ownerIdProp) return ownerIdProp
    if (effectiveInvoice && 'owner_id' in effectiveInvoice && effectiveInvoice.owner_id) {
      return effectiveInvoice.owner_id
    }
    return ''
  }, [ownerIdProp, effectiveInvoice])

  // Reset modal state when opened
  useEffect(() => {
    if (isModalOpen) {
      setChoice('total')
      setOtherAmount(0)
      setShowBelowMinConfirm(false)
    }
  }, [isModalOpen, invoiceId])

  const chosenAmount = useMemo(() => {
    if (choice === 'total') return total
    if (choice === 'minimum') return minimum
    return otherAmount
  }, [choice, total, minimum, otherAmount])

  const isBelowMin = choice === 'other' && otherAmount > 0 && otherAmount < minimum
  const isPartial =
    (choice === 'other' && otherAmount > 0 && otherAmount >= minimum && otherAmount < total) ||
    (choice === 'minimum' && minimum < total)
  const isAboveTotal = choice === 'other' && otherAmount > total
  const canConfirm = chosenAmount > 0 && (choice !== 'other' || otherAmount > 0)

  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  const executePayment = async (amount: number) => {
    if (!effectiveInvoice || !invoiceId || !resolvedFamilyId) return

    setSaving(true)
    try {
      const refLabel = monthRefShort(monthRef) || monthRefLabel(monthRef)

      // a. Pagamento = total
      // b. Pagamento >= mínimo e < total (partial)
      // c. Pagamento < mínimo (partial com juros)
      // d. Pagamento > total (paid + crédito)
      const txPayload: Record<string, unknown> = {
        family_id: resolvedFamilyId,
        ...(resolvedOwnerId ? { owner_id: resolvedOwnerId } : {}),
        type: 'expense' as const,
        amount,
        description:
          amount >= total
            ? `Fatura ${resolvedCardName} - ${refLabel}`
            : `Pagamento parcial fatura ${resolvedCardName} - ${refLabel}`,
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
        invoiceUpdate.status = 'paid'
        invoiceUpdate.paid_at = new Date().toISOString()
        invoiceUpdate.partial_amount = null
      } else {
        invoiceUpdate.status = 'partial'
        invoiceUpdate.partial_amount = amount
        invoiceUpdate.paid_at = new Date().toISOString()
      }

      // 1. Criar transação via PocketBase
      await pb.collection('transactions').create(txPayload)

      // 2. Atualizar status da fatura via PocketBase
      await pb.collection('invoices').update(invoiceId, invoiceUpdate)

      // 3. Toasts informativos específicos por caso:
      if (amount > total) {
        const diff = Math.round((amount - total) * 100) / 100
        toast({
          title: 'Fatura paga com abatimento extra',
          description: `Crédito de ${formatBRL(diff)} disponível.`,
        })
      } else if (amount >= total) {
        toast({
          title: 'Fatura paga integralmente',
        })
      } else if (amount < minimum) {
        const restante = Math.round((total - amount) * 100) / 100
        toast({
          variant: 'destructive',
          title: 'Pagamento abaixo do mínimo registrado',
          description: `Restante: ${formatBRL(restante)} (gerará juros de rotativo).`,
        })
      } else {
        const restante = Math.round((total - amount) * 100) / 100
        toast({
          title: 'Pagamento parcial registrado',
          description: `Restante: ${formatBRL(restante)} (irá para rotativo com juros).`,
        })
      }

      handleClose()
      onPaid?.()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar pagamento',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
      setShowBelowMinConfirm(false)
    }
  }

  const handleConfirmClick = async () => {
    if (!canConfirm) return
    if (isBelowMin) {
      setShowBelowMinConfirm(true)
      return
    }
    await executePayment(chosenAmount)
  }

  if (!effectiveInvoice) return null

  const displayMonthLong = monthRefLabel(monthRef)

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={(openState) => !openState && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-foreground">
              <CreditCard className="h-5 w-5 text-blue-600" />
              PAGAMENTO DE FATURA
            </DialogTitle>
            <DialogDescription asChild>
              <div className="pt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-foreground">Fatura:</span>{' '}
                  {resolvedCardName}
                  {displayMonthLong ? ` - ${displayMonthLong}` : ''}
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-foreground">
                    Vencimento:
                  </span>{' '}
                  {dueDateStr}
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span>
                    <strong className="text-gray-900 dark:text-foreground">Valor total:</strong>{' '}
                    {formatBRL(total)}
                  </span>
                  <span>
                    <strong className="text-gray-900 dark:text-foreground">
                      Pagamento mínimo:
                    </strong>{' '}
                    {formatBRL(minimum)} (15%)
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* QUANTO PAGAR? */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quanto pagar?
              </span>
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
            </div>

            <RadioGroup
              value={choice}
              onValueChange={(v) => setChoice(v as PaymentChoice)}
              className="gap-2"
            >
              <Label
                htmlFor="choice-total"
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors',
                  choice === 'total'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value="total" id="choice-total" />
                  <span className="text-sm font-medium">Valor total</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-foreground">
                  {formatBRL(total)}
                </span>
              </Label>

              <Label
                htmlFor="choice-minimum"
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors',
                  choice === 'minimum'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value="minimum" id="choice-minimum" />
                  <span className="text-sm font-medium">Valor mínimo (15%)</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-foreground">
                  {formatBRL(minimum)}
                </span>
              </Label>

              <Label
                htmlFor="choice-other"
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors',
                  choice === 'other'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value="other" id="choice-other" />
                  <span className="text-sm font-medium">Outro valor</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <CurrencyInput
                    value={otherAmount}
                    onChange={(v) => {
                      setOtherAmount(v)
                      if (choice !== 'other') setChoice('other')
                    }}
                    placeholder="R$ 0,00"
                    emptyOnZero
                    className="max-w-[140px] h-8 text-right text-xs"
                    aria-label="Outro valor"
                  />
                </div>
              </Label>
            </RadioGroup>

            {/* [se "Outro valor" < mínimo]: aviso condicional */}
            {isBelowMin && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Valor abaixo do mínimo (15%).</p>
                  <p>Pode gerar juros altos de rotativo.</p>
                </div>
              </div>
            )}

            {/* [se "Outro valor" < total e >= mín] ou seleção do mínimo */}
            {isPartial && (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-800 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Pagamento parcial.</p>
                  <p>
                    O restante ({formatBRL(Math.max(0, total - chosenAmount))}) vai para o rotativo
                    com juros. Considere parcelar.
                  </p>
                </div>
              </div>
            )}

            {/* [se "Outro valor" > total] */}
            {isAboveTotal && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Pagamento acima do total.</p>
                  <p>Crédito de {formatBRL(otherAmount - total)} disponível.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmClick}
              disabled={saving || !canConfirm}
              className="bg-[#166534] hover:bg-[#15803D] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                'Confirmar Pagamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de confirmação extra para pagamento abaixo do mínimo */}
      <AlertDialog open={showBelowMinConfirm} onOpenChange={setShowBelowMinConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Valor abaixo do mínimo permitido
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Você selecionou pagar <strong>{formatBRL(chosenAmount)}</strong>, que é menor do que
                o mínimo permitido de <strong>{formatBRL(minimum)}</strong> (15% da fatura).
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Isso pode gerar juros altos de rotativo e taxas bancárias. Deseja confirmar mesmo
                assim?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executePayment(chosenAmount)}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                'Sim, confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Alias for InvoicePaymentDialog */
export const InvoicePaymentModal = InvoicePaymentDialog
