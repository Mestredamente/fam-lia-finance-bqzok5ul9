import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Loader2,
  FileX,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Trash2,
  Layers,
} from 'lucide-react'
import { ClientResponseError } from 'pocketbase'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useAnnouncer } from '@/hooks/use-announcer'
import { useInvoiceItems } from '@/hooks/use-invoice-items'
import { useCategories } from '@/hooks/use-categories'
import { getInvoice, updateInvoice, parseInvoice, convertInvoiceItems } from '@/services/invoices'
import { updateInvoiceItem } from '@/services/invoice-items'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { InvoiceItemRow } from '@/components/InvoiceItemRow'
import { DeleteInvoiceDialog } from '@/components/DeleteInvoiceDialog'
import { EmptyState } from '@/components/EmptyState'
import { formatBRL, getMonthName, cn } from '@/lib/utils'
import { getParseStatus } from '@/lib/invoice-utils'
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [lastSelectedCategory, setLastSelectedCategory] = useState('')
  const [failedItemIds, setFailedItemIds] = useState<string[]>([])

  const { items, loading: itemsLoading, error: itemsError, refetch } = useInvoiceItems(invoiceId)
  const { categories } = useCategories(family?.id)
  const { announce } = useAnnouncer()

  useEffect(() => {
    if (!invoiceId) return
    setLoading(true)
    getInvoice(invoiceId)
      .then(setInvoice)
      .catch(() => setError('Erro ao carregar fatura'))
      .finally(() => setLoading(false))
  }, [invoiceId])

  useRealtime(
    'invoices',
    (e) => {
      if (e.record.id === invoiceId) {
        const newStatus = e.record['status'] as string | undefined
        if (newStatus === 'parsed' && invoice?.status !== 'parsed') {
          announce('Fatura processada')
        }
        if (newStatus === 'error' && invoice?.status !== 'error') {
          announce('Erro ao processar fatura', 'assertive')
        }
        getInvoice(invoiceId)
          .then(setInvoice)
          .catch(() => {})
      }
    },
    !!invoiceId,
  )

  const parseStatus = invoice ? getParseStatus(invoice) : 'none'

  const itemCategories = useMemo(() => {
    const cats: Record<string, string> = {}
    items.forEach((item) => {
      cats[item.id] =
        categoryOverrides[item.id] !== undefined
          ? categoryOverrides[item.id]
          : item.confirmed_category_id || item.suggested_category_id || ''
    })
    return cats
  }, [items, categoryOverrides])

  const categorizedCount = useMemo(
    () => Object.values(itemCategories).filter(Boolean).length,
    [itemCategories],
  )
  const totalCount = items.length
  const uncategorizedCount = totalCount - categorizedCount

  const unconvertedItems = useMemo(() => items.filter((i) => !i.converted_transaction_id), [items])
  const convertedItems = useMemo(() => items.filter((i) => i.converted_transaction_id), [items])

  const handleCategoryChange = (itemId: string, categoryId: string) => {
    setCategoryOverrides((prev) => ({ ...prev, [itemId]: categoryId }))
    if (categoryId) setLastSelectedCategory(categoryId)
    setFailedItemIds((prev) => prev.filter((id) => id !== itemId))
    updateInvoiceItem(itemId, { confirmed_category_id: categoryId || '' }).catch(() => {})
  }

  const handleApplyCategoryToAll = () => {
    if (!lastSelectedCategory) {
      toast({ variant: 'destructive', title: 'Selecione uma categoria primeiro' })
      return
    }
    const updates: Record<string, string> = {}
    items.forEach((item) => {
      if (!itemCategories[item.id]) {
        updates[item.id] = lastSelectedCategory
      }
    })
    if (Object.keys(updates).length === 0) {
      toast({ title: 'Todos os itens já têm categoria' })
      return
    }
    setCategoryOverrides((prev) => ({ ...prev, ...updates }))
    Object.entries(updates).forEach(([itemId, catId]) => {
      updateInvoiceItem(itemId, { confirmed_category_id: catId }).catch(() => {})
    })
    toast({ title: `${Object.keys(updates).length} itens categorizados` })
  }

  const handleConvert = async (itemId: string) => {
    if (!invoiceId) return
    const catId = itemCategories[itemId] || ''
    setFailedItemIds((prev) => prev.filter((id) => id !== itemId))
    try {
      await updateInvoiceItem(itemId, {
        confirmed_category_id: catId || '',
        is_confirmed: true,
      })
      await convertInvoiceItems(invoiceId, [itemId])
      toast({ title: 'Item convertido em transação' })
    } catch (err) {
      let errorMsg = getErrorMessage(err)
      if (err instanceof ClientResponseError) {
        const resp = err.response as Record<string, unknown>
        errorMsg = (resp?.error as string) || (resp?.message as string) || err.message
        console.error('Convert error for item', itemId, {
          status: err.status,
          body: resp,
          failed_item: resp?.failed_item,
          failed_items: resp?.failed_items,
        })
      } else {
        console.error('Convert error for item', itemId, err)
      }
      setFailedItemIds((prev) => [...new Set([...prev, itemId])])
      toast({
        variant: 'destructive',
        title: 'Erro ao converter item',
        description: errorMsg,
      })
    }
  }

  const handleConfirmAll = () => {
    if (uncategorizedCount > 0) {
      setShowConfirmDialog(true)
      return
    }
    doConvertAll()
  }

  const doConvertAll = async () => {
    setShowConfirmDialog(false)
    if (!invoiceId) return
    const convertible = unconvertedItems.map((i) => i.id)
    if (convertible.length === 0) {
      toast({ title: 'Todos os itens já foram convertidos' })
      return
    }
    setConvertingAll(true)
    try {
      await Promise.all(
        items.map((item) =>
          updateInvoiceItem(item.id, {
            confirmed_category_id: itemCategories[item.id] || '',
            is_confirmed: true,
          }).catch((err) => {
            console.error('Failed to update item category', item.id, err)
          }),
        ),
      )
      const result = await convertInvoiceItems(invoiceId, convertible)
      if (result.errors && result.errors.length > 0) {
        const failedIds = result.errors
          .map((e: { item_id?: string }) => e.item_id)
          .filter((id): id is string => !!id)
        setFailedItemIds(failedIds)
        toast({
          variant: 'destructive',
          title: `${result.count} convertidos, ${result.errors.length} com erro`,
          description: result.errors.map((e: { error: string }) => e.error).join(', '),
        })
        console.error('Convert partial failure', {
          status: 200,
          body: result,
          failed_items: failedIds,
        })
      } else {
        setFailedItemIds([])
        toast({ title: `${result.count} itens convertidos em transações` })
      }
    } catch (err) {
      let errorMsg = getErrorMessage(err)
      let failedItems: string[] = []
      if (err instanceof ClientResponseError) {
        const resp = err.response as Record<string, unknown>
        errorMsg = (resp?.error as string) || (resp?.message as string) || err.message
        const failedItem = resp?.failed_item as string
        const failedItemsArr = (resp?.failed_items as string[]) || []
        failedItems = [
          ...new Set([
            ...(failedItem ? [failedItem] : []),
            ...failedItemsArr.filter((id): id is string => !!id),
          ]),
        ]
        console.error('Convert all error', {
          status: err.status,
          body: resp,
          failed_item: failedItem,
          failed_items: failedItemsArr,
        })
      } else {
        console.error('Convert all error', err)
      }
      setFailedItemIds(failedItems)
      toast({
        variant: 'destructive',
        title: 'Erro ao converter itens',
        description: errorMsg,
      })
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
      <div
        className="space-y-4 animate-fade-in"
        role="status"
        aria-label="Carregando"
        aria-busy="true"
      >
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
          <FileX className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-sm font-medium text-red-600">{error || 'Fatura não encontrada'}</p>
          <p className="text-xs text-gray-500">
            A fatura pode ter sido excluída. Volte e faça o upload da fatura novamente.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate(`/cards/${cardId}`)}>
            Voltar para o cartão
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowDeleteDialog(true)}
          aria-label="Excluir fatura"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <Card className="rounded-2xl border-gray-100 shadow-subtle">
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total</p>
              <p className="font-bold text-gray-900">{formatBRL(invoice.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Categorizados</p>
              <p className="font-bold text-[#22C55E]">
                {categorizedCount} de {totalCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Convertidos</p>
              <p className="font-bold text-gray-900">{convertedItems.length}</p>
            </div>
          </div>
          <div>
            <Progress
              value={totalCount ? (categorizedCount / totalCount) * 100 : 0}
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {categorizedCount} de {totalCount} itens categorizados
            </p>
          </div>
        </CardContent>
      </Card>

      {parseStatus === 'processing' ? (
        <Card className="rounded-2xl border-blue-200 bg-blue-50" aria-busy="true">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div
              className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center"
              aria-hidden="true"
            >
              <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
            </div>
            <p className="text-sm font-medium text-blue-900">Processando fatura com IA...</p>
            <p className="text-xs text-blue-600">
              Os itens extraídos aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : parseStatus === 'error' && !itemsLoading && items.length === 0 ? (
        <Card className="rounded-2xl border-red-200 bg-red-50">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-900">Erro na importação</p>
            <p className="text-xs text-red-600">Não foi possível processar a fatura com IA.</p>
            <Button
              size="sm"
              onClick={handleReparse}
              disabled={reparsing}
              className="bg-red-600 hover:bg-red-700"
            >
              {reparsing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {parseStatus === 'error' && items.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700 flex-1">Alguns itens não puderam ser extraídos.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReparse}
                disabled={reparsing}
                className="h-7 text-xs"
              >
                {reparsing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Tentar novamente
              </Button>
            </div>
          )}
          {itemsLoading ? (
            <div className="space-y-3" role="status" aria-label="Carregando" aria-busy="true">
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
            <EmptyState
              icon={<FileX />}
              title="Nenhum item extraído"
              actionLabel="Reprocessar"
              onAction={handleReparse}
              actionDisabled={reparsing}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {categorizedCount} de {totalCount} itens categorizados
                  </h2>
                  {uncategorizedCount > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                      {uncategorizedCount} sem categoria
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {uncategorizedCount > 0 && lastSelectedCategory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApplyCategoryToAll}
                      className="h-7 text-xs"
                    >
                      <Layers className="h-3 w-3 mr-1 shrink-0" />
                      <span className="hidden sm:inline">Aplicar categoria a todos</span>
                      <span className="sm:hidden">Aplicar a todos</span>
                    </Button>
                  )}
                  {unconvertedItems.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleConfirmAll}
                      disabled={convertingAll}
                      className="h-7 text-xs bg-[#166534] hover:bg-[#15803D]"
                    >
                      {convertingAll ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Confirmar todos
                    </Button>
                  )}
                </div>
              </div>

              {unconvertedItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Itens ({unconvertedItems.length})
                  </h3>
                  {unconvertedItems.map((item) => (
                    <InvoiceItemRow
                      key={item.id}
                      item={item}
                      categories={categories}
                      selectedCategoryId={itemCategories[item.id] || ''}
                      onCategoryChange={handleCategoryChange}
                      onConvert={handleConvert}
                      isFailed={failedItemIds.includes(item.id)}
                    />
                  ))}
                </div>
              )}

              {convertedItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Convertidos ({convertedItems.length})
                  </h3>
                  {convertedItems.map((item) => (
                    <InvoiceItemRow
                      key={item.id}
                      item={item}
                      categories={categories}
                      selectedCategoryId={itemCategories[item.id] || ''}
                      onCategoryChange={handleCategoryChange}
                      onConvert={handleConvert}
                      isFailed={failedItemIds.includes(item.id)}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {invoice.status === 'pending' && (
                  <Button
                    onClick={() => handleStatusUpdate('reviewed')}
                    disabled={updatingStatus || unconvertedItems.length > 0}
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
        </>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Itens sem categoria</AlertDialogTitle>
            <AlertDialogDescription>
              {uncategorizedCount} {uncategorizedCount === 1 ? 'item não tem' : 'itens não têm'}{' '}
              categoria selecionada. Deseja criar as transações mesmo assim, sem categoria?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirmDialog(false)
                toast({ title: 'Selecione uma categoria para todos os itens antes de confirmar.' })
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={doConvertAll}>Confirmar sem categoria</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteInvoiceDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        invoiceId={invoiceId ?? ''}
        monthLabel={`${getMonthName(monthDate.getMonth())} ${monthDate.getFullYear()}`}
        onSuccess={() => navigate(`/cards/${cardId}`)}
      />
    </div>
  )
}
