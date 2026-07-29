import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, FileX, RefreshCw, CheckCircle2, FileCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useInvoiceItems } from '@/hooks/use-invoice-items'
import { useCategories } from '@/hooks/use-categories'
import { getInvoice, updateInvoice, parseInvoice, convertInvoiceItems } from '@/services/invoices'
import { updateInvoiceItem } from '@/services/invoice-items'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { InvoiceItemRow } from '@/components/InvoiceItemRow'
import { formatBRL, getMonthName, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { InvoiceRecord } from '@/types/finance'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente de revisão', className: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Revisada', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paga', className: 'bg-green-100 text-green-700' },
}

export default function InvoiceReview() {
  const { cardId, invoiceId } = useParams<{ cardId: string; invoiceId: string }>()
  const navigate = useNavigate()
  const { family } = useAuth()

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reparsing, setReparsing] = useState(false)
  const [convertingAll, setConvertingAll] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const { items, loading: itemsLoading, error: itemsError, refetch } = useInvoiceItems(invoiceId)
  const { categories } = useCategories(family?.id)

  useEffect(() => {
    if (!invoiceId) return
    setLoading(true)
    getInvoice(invoiceId)
      .then(setInvoice)
      .catch(() => setError('Erro ao carregar fatura'))
      .finally(() => setLoading(false))
  }, [invoiceId])

  const unconfirmedItems = useMemo(() => items.filter((i) => !i.is_confirmed), [items])
  const confirmedItems = useMemo(() => items.filter((i) => i.is_confirmed), [items])
  const confirmedAmount = useMemo(
    () => confirmedItems.reduce((sum, i) => sum + i.amount, 0),
    [confirmedItems],
  )
  const remainingAmount = (invoice?.total_amount || 0) - confirmedAmount
  const progressRatio = invoice?.total_amount ? (confirmedAmount / invoice.total_amount) * 100 : 0

  const handleConfirm = async (itemId: string, categoryId: string) => {
    try {
      await updateInvoiceItem(itemId, { is_confirmed: true, confirmed_category_id: categoryId })
      toast({ title: 'Item confirmado' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao confirmar item' })
    }
  }

  const handleConvert = async (itemId: string) => {
    if (!invoiceId) return
    try {
      await convertInvoiceItems(invoiceId, [itemId])
      toast({ title: 'Item convertido em transação' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao converter item' })
    }
  }

  const handleConvertAll = async () => {
    if (!invoiceId) return
    const convertible = confirmedItems.filter((i) => !i.converted_transaction_id).map((i) => i.id)
    if (convertible.length === 0) return
    setConvertingAll(true)
    try {
      await convertInvoiceItems(invoiceId, convertible)
      toast({ title: `${convertible.length} itens convertidos em transações` })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao converter itens' })
    } finally {
      setConvertingAll(false)
    }
  }

  const handleStatusUpdate = async (status: 'reviewed' | 'paid') => {
    if (!invoiceId || !invoice) return
    setUpdatingStatus(true)
    try {
      await updateInvoice(invoiceId, { status })
      setInvoice({ ...invoice, status })
      toast({
        title: status === 'reviewed' ? 'Fatura marcada como revisada' : 'Fatura marcada como paga',
      })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar fatura' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleReparse = async () => {
    if (!invoiceId) return
    setReparsing(true)
    try {
      await parseInvoice(invoiceId)
      toast({ title: 'Processando fatura com IA...' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao processar fatura' })
    } finally {
      setReparsing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <Card className="border-red-200 rounded-2xl">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-red-600">{error || 'Fatura não encontrada'}</p>
          <Button size="sm" variant="outline" onClick={() => navigate(`/cards/${cardId}`)}>
            Voltar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const monthDate = new Date(invoice.month_ref.split(' ')[0] + 'T00:00:00')
  const statusInfo = statusConfig[invoice.status] || statusConfig.pending

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/cards/${cardId}`)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            Revisar Fatura – {getMonthName(monthDate.getMonth())} {monthDate.getFullYear()}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">
              {invoice.expand?.card_id?.name || 'Cartão'} •{' '}
              {invoice.expand?.card_id?.card_brand || ''}
            </span>
            <Badge className={cn('text-[10px]', statusInfo.className)}>{statusInfo.label}</Badge>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-gray-100 shadow-subtle">
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total</p>
              <p className="font-bold text-gray-900">{formatBRL(invoice.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Confirmado</p>
              <p className="font-bold text-[#22C55E]">{formatBRL(confirmedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Restante</p>
              <p className="font-bold text-gray-900">{formatBRL(Math.max(0, remainingAmount))}</p>
            </div>
          </div>
          <div>
            <Progress value={progressRatio} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">{Math.round(progressRatio)}% confirmado</p>
          </div>
        </CardContent>
      </Card>

      {itemsLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : itemsError ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-red-600">Erro ao carregar itens da fatura</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <FileX className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhum item extraído</p>
            <Button
              size="sm"
              onClick={handleReparse}
              disabled={reparsing}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              {reparsing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Processar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {unconfirmedItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Itens não confirmados ({unconfirmedItems.length})
              </h3>
              {unconfirmedItems.map((item) => (
                <InvoiceItemRow
                  key={item.id}
                  item={item}
                  categories={categories}
                  onConfirm={handleConfirm}
                  onConvert={handleConvert}
                />
              ))}
            </div>
          )}

          {confirmedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Itens confirmados ({confirmedItems.length})
                </h3>
                {confirmedItems.some((i) => !i.converted_transaction_id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConvertAll}
                    disabled={convertingAll}
                    className="h-7 text-xs"
                  >
                    {convertingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Converter todos
                  </Button>
                )}
              </div>
              {confirmedItems.map((item) => (
                <InvoiceItemRow
                  key={item.id}
                  item={item}
                  categories={categories}
                  onConfirm={handleConfirm}
                  onConvert={handleConvert}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {invoice.status === 'pending' && (
              <Button
                onClick={() => handleStatusUpdate('reviewed')}
                disabled={updatingStatus || unconfirmedItems.length > 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileCheck className="h-4 w-4 mr-2" />
                )}
                Marcar como revisada
              </Button>
            )}
            {invoice.status === 'reviewed' && (
              <Button
                onClick={() => handleStatusUpdate('paid')}
                disabled={updatingStatus}
                className="flex-1 bg-[#22C55E] hover:bg-green-600"
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Marcar como paga
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
