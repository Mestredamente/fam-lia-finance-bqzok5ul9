import { useState } from 'react'
import { Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { getDebtMeta } from '@/lib/patrimony-icons'
import { formatBRL } from '@/lib/utils'
import type { DebtRecord } from '@/types/finance'

interface Props {
  debt: DebtRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
  onRegisterPayment: () => void
}

export function DebtDetailSheet({
  debt,
  open,
  onOpenChange,
  isOwner,
  onEdit,
  onDelete,
  onRegisterPayment,
}: Props) {
  const [confirmPayment, setConfirmPayment] = useState(false)

  if (!debt) return null

  const meta = getDebtMeta(debt.type)
  const Icon = meta.icon
  const progress =
    debt.installments_total > 0 ? (debt.installments_paid / debt.installments_total) * 100 : 0

  // Cálculos derivados
  const installmentsRemaining = Math.max(0, debt.installments_total - debt.installments_paid)
  const somaDasPrestacoes = debt.installment_value * debt.installments_total
  const jaPago = debt.installment_value * debt.installments_paid
  const restanteCalculado = debt.installment_value * installmentsRemaining

  // Saldo devedor: só exibe se preenchido (e pode ser diferente de remaining_amount)
  const showBalanceDue =
    debt.balance_due != null && debt.balance_due > 0 && debt.balance_due !== debt.remaining_amount

  const hasFinancialDetails =
    !!debt.amortization_system ||
    debt.interest_rate > 0 ||
    debt.cet != null ||
    debt.financed_amount != null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle className="text-center">Detalhes da Dívida</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: meta.color + '20' }}
              >
                <Icon className="h-6 w-6" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">{debt.description}</h3>
                <p className="text-xs text-gray-500">Vencimento todo dia {debt.due_day}</p>
              </div>
              <Badge style={{ backgroundColor: meta.color + '20', color: meta.color }}>
                {meta.label}
              </Badge>
            </div>

            {/* Grid de Valores: Soma, Já Pago, Restante, Parcela */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Soma das prestações</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatBRL(somaDasPrestacoes)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/70 rounded-xl">
                <span className="text-xs text-emerald-700 block">Já pago</span>
                <span className="text-sm font-bold text-emerald-800">{formatBRL(jaPago)}</span>
              </div>
              <div className="p-3 bg-rose-50/70 rounded-xl">
                <span className="text-xs text-rose-700 block">Restante a pagar</span>
                <span className="text-sm font-bold text-rose-800">
                  {formatBRL(restanteCalculado)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Parcela mensal</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatBRL(debt.installment_value)}
                </span>
              </div>
            </div>

            {/* Saldo devedor para quitação antecipada (se preenchido e diferente do restante) */}
            {debt.balance_due != null && debt.balance_due > 0 && (
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-blue-900 block">
                      Saldo devedor (Quitação)
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Valor fornecido pelo banco para quitação antecipada
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-900">
                    {formatBRL(debt.balance_due)}
                  </span>
                </div>
              </div>
            )}

            {/* Barra de Progresso */}
            <div className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-700">
                <span>
                  {debt.installments_paid} de {debt.installments_total} parcelas pagas (
                  {installmentsRemaining} restantes)
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#22C55E] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Seção de Dados Financeiros */}
            {hasFinancialDetails && (
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-gray-600 block uppercase tracking-wider">
                  Dados Financeiros
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {debt.amortization_system && (
                    <div>
                      <span className="text-gray-500 block">Amortização</span>
                      <span className="font-semibold text-gray-800">
                        {debt.amortization_system === 'PRICE'
                          ? 'PRICE (Fixa)'
                          : debt.amortization_system === 'SAC'
                            ? 'SAC (Decrescente)'
                            : debt.amortization_system}
                      </span>
                    </div>
                  )}
                  {debt.interest_rate != null && (
                    <div>
                      <span className="text-gray-500 block">Taxa de juros</span>
                      <span className="font-semibold text-gray-800">
                        {debt.interest_rate}% a.m.
                      </span>
                    </div>
                  )}
                  {debt.cet != null && debt.cet > 0 && (
                    <div>
                      <span className="text-gray-500 block">CET</span>
                      <span className="font-semibold text-gray-800">{debt.cet}% a.a.</span>
                    </div>
                  )}
                  {debt.financed_amount != null && debt.financed_amount > 0 && (
                    <div>
                      <span className="text-gray-500 block">Valor financiado</span>
                      <span className="font-semibold text-gray-800">
                        {formatBRL(debt.financed_amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {debt.notes && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block mb-1">Observações</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{debt.notes}</p>
              </div>
            )}

            {debt.expand?.owner_id && (
              <p className="text-xs text-gray-500 text-center">
                Titular: {debt.expand.owner_id.display_name}
              </p>
            )}

            {/* Ações */}
            {isOwner && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmPayment(true)}
                  disabled={debt.installments_paid >= debt.installments_total}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar pagamento
                </Button>
                <Button variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmPayment} onOpenChange={setConfirmPayment}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#166534]" />
              Confirmar pagamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Confirmar pagamento de {formatBRL(debt.installment_value)} referente à parcela{' '}
              {debt.installments_paid + 1} de {debt.installments_total}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPayment(false)
                onRegisterPayment()
              }}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
