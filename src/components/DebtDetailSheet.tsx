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
  const progress = (debt.installments_paid / debt.installments_total) * 100

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-center">Detalhes da Dívida</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: meta.color + '20' }}
              >
                <Icon className="h-6 w-6" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{debt.description}</h3>
              </div>
              <Badge style={{ backgroundColor: meta.color + '20', color: meta.color }}>
                {meta.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Valor restante</span>
                <span className="text-sm font-bold text-red-600">
                  {formatBRL(debt.remaining_amount)}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Parcela mensal</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatBRL(debt.installment_value)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-700">
                <span>
                  {debt.installments_paid} de {debt.installments_total} parcelas pagas
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
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Juros</span>
                <span className="text-sm font-medium text-gray-900">
                  {debt.interest_rate}% a.m.
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Vencimento</span>
                <span className="text-sm font-medium text-gray-900">Dia {debt.due_day}</span>
              </div>
            </div>
            {debt.notes && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block mb-1">Observações</span>
                <p className="text-sm text-gray-700">{debt.notes}</p>
              </div>
            )}
            {debt.expand?.owner_id && (
              <p className="text-xs text-gray-500 text-center">
                Titular: {debt.expand.owner_id.display_name}
              </p>
            )}
            {isOwner && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmPayment(true)}
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
