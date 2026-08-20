import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  Sparkles,
  Clock,
  AlertTriangle,
  WifiOff,
  CreditCard,
} from 'lucide-react'
import { ClientResponseError } from 'pocketbase'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useRealtime } from '@/hooks/use-realtime'
import { useAnnouncer } from '@/hooks/use-announcer'
import { useInvoiceItems } from '@/hooks/use-invoice-items'
import { useCategories } from '@/hooks/use-categories'
import {
  getInvoice,
  updateInvoice,
  parseInvoice,
  convertInvoiceItems,
  aiCategorizeInvoiceItems,
} from '@/services/invoices'
import { updateInvoiceItem, deleteInvoiceItem } from '@/services/invoice-items'
import { deleteTransaction } from '@/services/transactions'
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
import { getParseStatus, getParseError } from '@/lib/invoice-utils'
import { detectErrorCode, getErrorConfig, type InvoiceErrorConfig } from '@/lib/invoice-errors'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { toast } from '@/hooks/use-toast'
import type { InvoiceRecord, InvoiceItemRecord, TransactionEmotion } from '@/types/finance'

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente de revisão', className: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Revisada', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paga', className: 'bg-green-100 text-green-700' },
  parsed: { label: 'Processada', className: 'bg-purple-100 text-purple-700' },
  error: { label: 'Erro', className: 'bg-red-100 text-red-700' },
}

const TIMEOUT_MESSAGE = 'Tempo limite excedido. A fatura pode ser muito grande. Tente novamente.'

export default function InvoiceReview() {
  const { cardId, invoiceId } = useParams<{ cardId: string; invoiceId: string }>()
  const navigate = useNavigate()
  const { family, member } = useAuth()
  const perms = usePermissions()
  const canDeleteInvoices = perms.canDeleteInvoices()

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reparsing, setReparsing] = useState(false)
  const [convertingAll, setConvertingAll] = useState(false)
  const [aiCategorizing, setAiCategorizing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [excludeConfirmItem, setExcludeConfirmItem] = useState<InvoiceItemRecord | null>(null)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [emotionOverrides, setEmotionOverrides] = useState<
    Record<string, TransactionEmotion | null>
  >({})
  const [lastSelectedCategory, setLastSelectedCategory] = useState('')
  const [failedItemIds, setFailedItemIds] = useState<string[]>([])
  const [failedItemsDetail, setFailedItemsDetail] = useState<
    Array<{ item_id: string; description: string; error: string }>
  >([])
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [parsingSeconds, setParsingSeconds] = useState(0)
  const [parseError, setParseError] = useState<unknown>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualFormDefaultIsExpense, setManualFormDefaultIsExpense] = useState(true)
  const [unmatchedSamples, setUnmatchedSamples] = useState<string[]>([])
  const [aiProcessingLabel, setAiProcessingLabel] = useState<string | null>(null)
  const [aiNoMatchCount, setAiNoMatchCount] = useState(0)

  const { items, loading: itemsLoading, error: itemsError, refetch } = useInvoiceItems(invoiceId)
  const { categories } = useCategories(family?.id)
  const { announce } = useAnnouncer()

  const itemsRef = useRef(items)
  itemsRef.current = items

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
          setParseError(null)
        }
        if (newStatus === 'error' && invoice?.status !== 'error') {
          announce('Erro ao processar fatura', 'assertive')
          setParseError(null)
        }
        getInvoice(invoiceId)
          .then(setInvoice)
          .catch(() => {})
      }
    },
    !!invoiceId,
  )

  const parseStatus = invoice ? getParseStatus(invoice) : 'none'
  const isProcessing = !parseError && (parseStatus === 'processing' || reparsing)

  useEffect(() => {
    if (!isProcessing) {
      setParsingSeconds(0)
      return
    }
    const interval = setInterval(() => {
      setParsingSeconds((s) => {
        if (s + 1 >= 200) {
          setParseError(new Error('TIMEOUT'))
          return s + 1
        }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isProcessing])

  const activeItems = useMemo(
    () => items.filter((i) => !deletedItemIds.includes(i.id)),
    [items, deletedItemIds],
  )

  const itemCategories = useMemo(() => {
    const cats: Record<string, string> = {}
    activeItems.forEach((item) => {
      cats[item.id] =
        categoryOverrides[item.id] !== undefined
          ? categoryOverrides[item.id]
          : item.confirmed_category_id || item.suggested_category_id || ''
    })
    return cats
  }, [activeItems, categoryOverrides])

  const itemCategoriesRef = useRef(itemCategories)
  itemCategoriesRef.current = itemCategories

  const categorizedCount = useMemo(
    () => Object.values(itemCategories).filter(Boolean).length,
    [itemCategories],
  )
  const totalCount = activeItems.length
  const uncategorizedCount = totalCount - categorizedCount

  const unconvertedItems = useMemo(
    () => activeItems.filter((i) => !i.converted_transaction_id),
    [activeItems],
  )
  const convertedItems = useMemo(
    () => activeItems.filter((i) => i.converted_transaction_id),
    [activeItems],
  )

  const handleCategoryChange = useCallback((itemId: string, categoryId: string) => {
    setCategoryOverrides((prev) => ({ ...prev, [itemId]: categoryId }))
    if (categoryId) setLastSelectedCategory(categoryId)
    setFailedItemIds((prev) => prev.filter((id) => id !== itemId))
    setFailedItemsDetail((prev) => prev.filter((d) => d.item_id !== itemId))
  }, [])

  const handleEmotionChange = useCallback((itemId: string, emotion: TransactionEmotion | null) => {
    setEmotionOverrides((prev) => ({ ...prev, [itemId]: emotion }))
  }, [])

  const itemEmotions = useMemo(() => {
    const result: Record<string, TransactionEmotion | null> = {}
    activeItems.forEach((item) => {
      const override = emotionOverrides[item.id]
      result[item.id] = override !== undefined ? override : null
    })
    return result
  }, [activeItems, emotionOverrides])

  const itemEmotionsRef = useRef(itemEmotions)
  itemEmotionsRef.current = itemEmotions

  const handleDelete = useCallback((itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId)
    if (item?.converted_transaction_id) {
      setExcludeConfirmItem(item)
      return
    }
    setDeletedItemIds((prev) => [...prev, itemId])
    updateInvoiceItem(itemId, { excluded: true }).catch(() => {})
  }, [])

  const confirmExcludeItemOnly = async () => {
    if (!excludeConfirmItem) return
    const item = excludeConfirmItem
    setDeletedItemIds((prev) => [...prev, item.id])
    setExcludeConfirmItem(null)
    try {
      await deleteInvoiceItem(item.id)
      toast({ title: 'Item removido da fatura' })
      refetch()
    } catch {
      // Fallback: mark as excluded if delete fails
      updateInvoiceItem(item.id, { excluded: true }).catch(() => {})
    }
  }

  const confirmExcludeItemAndTransaction = async () => {
    if (!excludeConfirmItem) return
    const item = excludeConfirmItem
    const txId = item.converted_transaction_id
    setDeletedItemIds((prev) => [...prev, item.id])
    setExcludeConfirmItem(null)
    try {
      await deleteInvoiceItem(item.id)
      if (txId) {
        try {
          await deleteTransaction(txId)
        } catch (txErr) {
          console.error('Failed to delete transaction:', txErr)
        }
      }
      toast({ title: 'Item e transação removidos' })
      refetch()
    } catch {
      // Fallback
      updateInvoiceItem(item.id, { excluded: true }).catch(() => {})
    }
  }

  const handleApplyCategoryToAll = () => {
    if (!lastSelectedCategory) {
      toast({ variant: 'destructive', title: 'Selecione uma categoria primeiro' })
      return
    }
    const updates: Record<string, string> = {}
    activeItems.forEach((item) => {
      if (!itemCategories[item.id]) {
        updates[item.id] = lastSelectedCategory
      }
    })
    if (Object.keys(updates).length === 0) {
      toast({ title: 'Todos os itens já têm categoria' })
      return
    }
    setCategoryOverrides((prev) => ({ ...prev, ...updates }))
    toast({ title: `${Object.keys(updates).length} itens categorizados` })
  }

  const handleAiCategorize = async () => {
    if (!invoiceId) return
    setAiCategorizing(true)
    setAiProcessingLabel('Processando categorização com IA...')
    setUnmatchedSamples([])
    setAiNoMatchCount(0)
    try {
      const result = await aiCategorizeInvoiceItems(invoiceId)
      const byRules = result.categorized_by_rules ?? 0
      const byAI = result.categorized_by_ai ?? 0
      const noMatch = result.no_match ?? 0
      const aiError = result.ai_error ?? null
      const samples: string[] = result.unmatched_samples ?? []

      setUnmatchedSamples(samples)
      setAiNoMatchCount(noMatch)

      if (byRules > 0 || byAI > 0) {
        setCategoryOverrides({})
        refetch()
      }

      if (byRules > 0 && byAI === 0 && aiError) {
        toast({
          title: `${byRules} itens categorizados por regras. IA indisponível — tente novamente para os itens restantes.`,
        })
      } else if (byRules > 0 || byAI > 0) {
        toast({
          title: `${byRules} itens categorizados por regras, ${byAI} por IA, ${noMatch} sem categoria. Revise antes de confirmar.`,
        })
      } else if (aiError) {
        toast({
          variant: 'destructive',
          title: 'Categorização por IA falhou',
          description: aiError,
        })
      } else {
        toast({ title: 'Nenhum item para categorizar' })
      }
    } catch (err) {
      const errorMsg =
        err instanceof ClientResponseError
          ? ((err.response as Record<string, unknown>)?.error as string) || err.message
          : 'Erro ao categorizar com IA'
      toast({ variant: 'destructive', title: 'Erro na categorização', description: errorMsg })
    } finally {
      setAiCategorizing(false)
      setAiProcessingLabel(null)
    }
  }

  const handleConvert = useCallback(
    async (itemId: string) => {
      if (!invoiceId) return
      const catId = itemCategoriesRef.current[itemId] || ''
      setFailedItemIds((prev) => prev.filter((id) => id !== itemId))
      setFailedItemsDetail((prev) => prev.filter((d) => d.item_id !== itemId))
      try {
        await updateInvoiceItem(itemId, {
          confirmed_category_id: catId || '',
          is_confirmed: true,
        })
        const result = await convertInvoiceItems(invoiceId, [itemId], {
          [itemId]: itemEmotionsRef.current[itemId] || null,
        })
        if (result.errors && result.errors.length > 0) {
          const err = result.errors[0]
          setFailedItemIds((prev) => [...new Set([...prev, itemId])])
          setFailedItemsDetail((prev) => [
            ...prev.filter((d) => d.item_id !== itemId),
            { item_id: itemId, description: err.description || '', error: err.error },
          ])
          toast({
            variant: 'destructive',
            title: 'Erro ao converter item',
            description: err.error,
          })
        } else {
          toast({ title: 'Item convertido em transação' })
        }
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
        setFailedItemsDetail((prev) => [
          ...prev.filter((d) => d.item_id !== itemId),
          { item_id: itemId, description: '', error: errorMsg },
        ])
        toast({
          variant: 'destructive',
          title: 'Erro ao converter item',
          description: errorMsg,
        })
      }
    },
    [invoiceId],
  )

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
        unconvertedItems.map((item) =>
          updateInvoiceItem(item.id, {
            confirmed_category_id: itemCategories[item.id] || '',
            is_confirmed: true,
          }).catch((err) => {
            console.error('Failed to update item category', item.id, err)
          }),
        ),
      )
      const result = await convertInvoiceItems(
        invoiceId,
        convertible,
        Object.fromEntries(convertible.map((id) => [id, itemEmotionsRef.current[id] || null])),
      )
      if (result.errors && result.errors.length > 0) {
        const failedIds = result.errors
          .map((e: { item_id?: string }) => e.item_id)
          .filter((id): id is string => !!id)
        setFailedItemIds(failedIds)
        setFailedItemsDetail(
          result.errors.map((e: { item_id: string; description?: string; error: string }) => ({
            item_id: e.item_id,
            description: e.description || '',
            error: e.error,
          })),
        )
        toast({
          variant: 'destructive',
          title: `${result.count} transações criadas, ${result.errors.length} falharam`,
          description: result.errors.map((e: { error: string }) => e.error).join(', '),
        })
        console.error('Convert partial failure', {
          status: 200,
          body: result,
          failed_items: failedIds,
        })
      } else {
        setFailedItemIds([])
        setFailedItemsDetail([])
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
      setFailedItemsDetail(
        failedItems.map((id) => ({
          item_id: id,
          description: activeItems.find((i) => i.id === id)?.description || '',
          error: errorMsg,
        })),
      )
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
    setParseError(null)
    setParsingSeconds(0)
    try {
      await parseInvoice(invoiceId)
      toast({ title: 'Processando fatura com IA...' })
    } catch (err) {
      console.error('Reparse error', err)
      setParseError(err)
      const code = detectErrorCode(err)
      const config = getErrorConfig(code)
      toast({
        variant: 'destructive',
        title: config.title,
        description: config.body,
      })
    } finally {
      setReparsing(false)
    }
  }

  if (loading) {
    return (
      <div
        className="space-y-4 animate-fade-in max-w-4xl mx-auto"
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
      <div className="max-w-4xl mx-auto">
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
      </div>
    )
  }

  const monthDate = new Date(invoice.month_ref.split(' ')[0] + 'T00:00:00')
  const statusInfo = statusConfig[invoice.status] || statusConfig.pending

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
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
            {invoice.status === 'paid' && invoice.reviewed_at && (
              <Badge className="text-[10px] bg-blue-100 text-blue-700">Revisada</Badge>
            )}
          </div>
        </div>
        {canDeleteInvoices && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            aria-label="Excluir fatura"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
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

      {parseError ? (
        <ParseErrorCard
          config={getErrorConfig(detectErrorCode(parseError))}
          reparsing={reparsing}
          onRetry={handleReparse}
          onChooseFile={() => navigate(`/cards/${cardId}`)}
          onOk={() => setParseError(null)}
          onManualEntry={() => {
            setManualFormDefaultIsExpense(true)
            setShowManualForm(true)
          }}
        />
      ) : parseStatus === 'processing' ? (
        <Card className="rounded-2xl border-blue-200 bg-blue-50" aria-busy="true">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div
              className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center"
              aria-hidden="true"
            >
              <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
            </div>
            <p className="text-sm font-medium text-blue-900">Processando... {parsingSeconds}s</p>
            <p className="text-xs text-blue-600">
              Os itens extraídos aparecerão aqui automaticamente.
            </p>
            {parsingSeconds > 30 && (
              <p className="text-xs text-blue-500">Faturas grandes podem levar alguns minutos...</p>
            )}
          </CardContent>
        </Card>
      ) : parseStatus === 'error' && !itemsLoading && items.length === 0 ? (
        <ParseErrorCard
          config={getErrorConfig(detectErrorCode(getParseError(invoice)))}
          reparsing={reparsing}
          onRetry={handleReparse}
          onChooseFile={() => navigate(`/cards/${cardId}`)}
          onOk={() => setParseError(null)}
          onManualEntry={() => {
            setManualFormDefaultIsExpense(true)
            setShowManualForm(true)
          }}
        />
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
          ) : activeItems.length === 0 ? (
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
                  {uncategorizedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiCategorize}
                      disabled={aiCategorizing}
                      className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      {aiCategorizing ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1 shrink-0" />
                      )}
                      <span className="hidden sm:inline">
                        {aiCategorizing && aiProcessingLabel
                          ? 'Processando...'
                          : 'Categorizar com IA'}
                      </span>
                      <span className="sm:hidden">IA</span>
                    </Button>
                  )}
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

              {aiCategorizing && (
                <Card className="rounded-2xl border-purple-200 bg-purple-50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-purple-600 animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        {aiProcessingLabel || 'Processando categorização com IA...'}
                      </p>
                      <p className="text-xs text-purple-600">
                        Faturas com muitos itens são processadas em lotes e podem levar alguns
                        segundos cada.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {unmatchedSamples.length > 0 && !aiCategorizing && (
                <Card className="rounded-2xl border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">
                          {aiNoMatchCount}{' '}
                          {aiNoMatchCount === 1 ? 'item sem categoria' : 'itens sem categoria'}.
                          Exemplos: {unmatchedSamples.join(', ')} — considere criar regras para
                          estes.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                      selectedEmotion={itemEmotions[item.id]}
                      onCategoryChange={handleCategoryChange}
                      onEmotionChange={handleEmotionChange}
                      onConvert={handleConvert}
                      onDelete={handleDelete}
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
                      onEmotionChange={handleEmotionChange}
                      onConvert={handleConvert}
                      onDelete={handleDelete}
                      isFailed={failedItemIds.includes(item.id)}
                    />
                  ))}
                </div>
              )}

              {failedItemsDetail.length > 0 && (
                <Card className="rounded-2xl border-red-200 bg-red-50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <h3 className="text-sm font-bold text-red-900">
                          {failedItemsDetail.length}{' '}
                          {failedItemsDetail.length === 1 ? 'item falhou' : 'itens falharam'} na
                          conversão
                        </h3>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        onClick={() => setFailedItemsDetail([])}
                      >
                        Fechar
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {failedItemsDetail.map((detail) => (
                        <div
                          key={detail.item_id}
                          className="text-xs text-red-700 flex gap-1 flex-wrap"
                        >
                          <span className="font-medium shrink-0">
                            {detail.description || detail.item_id}:
                          </span>
                          <span>{detail.error}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {invoice.status === 'pending' && (
                  <Button
                    onClick={() => handleStatusUpdate('reviewed')}
                    disabled={updatingStatus || unconvertedItems.length > 0}
                    className="w-full sm:w-auto sm:min-w-[200px] bg-blue-600 hover:bg-blue-700"
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
                    onClick={() => navigate('/contas?tab=a_vencer')}
                    className="w-full sm:w-auto sm:max-w-xs bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar em Contas a Pagar
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

      {showManualForm && family && member && (
        <TransactionFormSheet
          open={showManualForm}
          onOpenChange={setShowManualForm}
          familyId={family.id}
          ownerId={member.id}
        />
      )}

      <AlertDialog
        open={!!excludeConfirmItem}
        onOpenChange={(open) => !open && setExcludeConfirmItem(null)}
      >
        <AlertDialogContent className="max-w-lg sm:max-w-lg p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-gray-600 dark:text-gray-300 whitespace-normal">
                <p>Este item foi convertido em transação.</p>
                <p>Ao excluir apenas o item: a transação permanece no seu histórico.</p>
                <p>Para remover tudo, use &quot;Excluir item e transação&quot;.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-1 sm:space-x-0 pt-2">
            <AlertDialogAction
              onClick={confirmExcludeItemAndTransaction}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white justify-center"
            >
              Excluir item e transação
            </AlertDialogAction>
            <Button
              variant="outline"
              onClick={confirmExcludeItemOnly}
              className="w-full px-4 py-2 border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 justify-center"
            >
              Excluir apenas o item
            </Button>
            <AlertDialogCancel className="w-full px-4 py-2 mt-0 justify-center">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ParseErrorCard({
  config,
  reparsing,
  onRetry,
  onChooseFile,
  onOk,
  onManualEntry,
}: {
  config: InvoiceErrorConfig
  reparsing: boolean
  onRetry: () => void
  onChooseFile: () => void
  onOk: () => void
  onManualEntry?: () => void
}) {
  const Icon =
    config.icon === 'clock'
      ? Clock
      : config.icon === 'file'
        ? FileX
        : config.icon === 'wifi'
          ? WifiOff
          : AlertTriangle
  return (
    <Card className="rounded-2xl border-amber-200 bg-amber-50">
      <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
          <Icon className="h-7 w-7 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-amber-900">{config.title}</p>
        <p className="text-xs text-amber-700">{config.body}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (config.primaryAction.type === 'retry') onRetry()
              else if (config.primaryAction.type === 'choose_file') onChooseFile()
              else onOk()
            }}
            disabled={reparsing && config.primaryAction.type === 'retry'}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {reparsing && config.primaryAction.type === 'retry' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : config.primaryAction.type === 'retry' ? (
              <RefreshCw className="h-4 w-4 mr-1" />
            ) : null}
            {config.primaryAction.label}
          </Button>
          {config.secondaryAction && onManualEntry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onManualEntry}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {config.secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
