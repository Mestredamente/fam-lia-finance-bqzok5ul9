import { useState } from 'react'
import { Share2, Calendar, Pencil, Trash2 } from 'lucide-react'
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
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface Props {
  transaction: TransactionRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
  isOwner,
  onEdit,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!transaction) return null

  const category = transaction.expand?.category_id
  const Icon = getCategoryIcon(category?.icon || 'plus-circle')
  const amountColor =
    transaction.type === 'income'
      ? 'text-[#22C55E]'
      : transaction.type === 'investment'
        ? 'text-blue-600'
        : 'text-red-600'
  const amountPrefix = transaction.type === 'income' ? '+ ' : '- '
  const date = new Date(transaction.transaction_date)
  const typeLabel =
    transaction.type === 'expense'
      ? 'Despesa'
      : transaction.type === 'income'
        ? 'Receita'
        : transaction.type === 'investment'
          ? 'Investimento'
          : 'Pagamento de Dívida'

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-center">Detalhes da Transação</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: (category?.color || '#999') + '20' }}
              >
                <Icon className="h-6 w-6" style={{ color: category?.color || '#999' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{transaction.description}</h3>
                <p className="text-sm text-gray-500">{category?.name || 'Sem categoria'}</p>
              </div>
              <span className={`text-xl font-bold ${amountColor} whitespace-nowrap`}>
                {amountPrefix}
                {formatBRL(transaction.amount)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Data</span>
                <span className="text-sm font-medium text-gray-900">
                  {date.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 block">Tipo</span>
                <span className="text-sm font-medium text-gray-900">{typeLabel}</span>
              </div>
            </div>
            {(transaction.is_shared || transaction.is_fixed) && (
              <div className="flex gap-2 flex-wrap">
                {transaction.is_shared && (
                  <Badge variant="outline" className="gap-1">
                    <Share2 className="h-3 w-3" /> Compartilhada
                  </Badge>
                )}
                {transaction.is_fixed && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" /> Fixa
                  </Badge>
                )}
              </div>
            )}
            {isOwner && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
