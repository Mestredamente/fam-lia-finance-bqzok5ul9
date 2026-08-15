import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { getInvoiceItemsByInvoiceId } from '@/services/invoice-items'
import { deleteInvoiceCascade } from '@/services/invoices'
import { toast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  monthLabel: string
  onSuccess?: () => void
}

export function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  monthLabel,
  onSuccess,
}: Props) {
  const [itemCount, setItemCount] = useState(0)
  const [transactionCount, setTransactionCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true)
    setItemCount(0)
    setTransactionCount(0)
    getInvoiceItemsByInvoiceId(invoiceId)
      .then((items) => {
        const activeItems = items.filter((i) => !i.excluded)
        setItemCount(activeItems.length)
        setTransactionCount(activeItems.filter((i) => i.converted_transaction_id).length)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const result = await deleteInvoiceCascade(invoiceId)
      const skippedMsg =
        result.skipped > 0 ? ` ${result.skipped} transação(ões) não puderam ser removidas.` : ''
      toast({
        title: `Fatura excluída. ${result.deleted.invoice_items} itens e ${result.deleted.transactions} transações removidos.${skippedMsg}`,
        className:
          result.skipped > 0
            ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
            : 'border-green-500 bg-green-50 text-green-800',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 404) {
        toast({
          title: 'Fatura não encontrada. Pode já ter sido excluída.',
          className: 'border-yellow-500 bg-yellow-50 text-yellow-800',
        })
        onOpenChange(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha ao excluir fatura. Tente novamente.',
        })
      }
    } finally {
      setDeleting(false)
    }
  }

  const showWarning = transactionCount > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fatura</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-500">
              <p className="font-medium text-gray-900">{monthLabel}</p>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <p>
                  <strong>{transactionCount}</strong> de <strong>{itemCount}</strong> transações
                  serão removidas
                </p>
              )}
              {showWarning && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-yellow-800">
                    Transações editadas manualmente não serão removidas
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={deleting || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              'Excluir permanentemente'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
