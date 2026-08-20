import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  Plus,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  CreditCard,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInvoices } from '@/hooks/use-invoices'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/hooks/use-auth'
import { getCreditCard } from '@/services/credit-cards'
import { parseInvoice } from '@/services/invoices'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CreditCardVisual } from '@/components/CreditCardVisual'
import { InvoiceFormSheet } from '@/components/InvoiceFormSheet'
import { DeleteInvoiceDialog } from '@/components/DeleteInvoiceDialog'
import { DebtFormSheet } from '@/components/DebtFormSheet'
import { formatBRL, getMonthName, cn } from '@/lib/utils'
import { getParseStatus, getParseError, type ParseStatus } from '@/lib/invoice-utils'
import { detectErrorCode, getErrorConfig } from '@/lib/invoice-errors'
import { toast } from '@/hooks/use-toast'
import type { CreditCardRecord } from '@/types/finance'

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Revisada', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paga', className: 'bg-green-100 text-green-700' },
  parsed: { label: 'Processada', className: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Erro', className: 'bg-red-100 text-red-700' },
  partial: { label: 'Parcial', className: 'bg-amber-100 text-amber-700' },
}

const parseStatusConfig: Record<ParseStatus, { label: string; className: string }> = {
  processing: { label: 'Processando', className: 'bg-blue-100 text-blue-700' },
  success: { label: 'Pendente de revisão', className: 'bg-yellow-100 text-yellow-700' },
  error: { label: 'Erro na importação', className: 'bg-red-100 text-red-700' },
  none: { label: '', className: '' },
}

export default function CardDetail() {
  const { cardId } = useParams<{ cardId: string }>()
  const navigate = useNavigate()
  const perms = usePermissions()
  const { family, member } = useAuth()
  const canDeleteInvoices = perms.canDeleteInvoices()
  const canImportInvoices = perms.canImportInvoices()
  const { invoices, loading, error, refetch } = useInvoices(cardId)
  const [card, setCard] = useState<CreditCardRecord | null>(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [reparsingId, setReparsingId] = useState<string | null>(null)
  const [timeoutErrorIds, setTimeoutErrorIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [showRotativoForm, setShowRotativoForm] = useState(false)

  // Saldo rotativo: soma dos restantes das faturas com pagamento parcial.
  const rotativo = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'partial')
      .reduce((sum, inv) => {
        const restante =
          inv.partial_amount != null
            ? inv.total_amount - (inv.partial_amount || 0)
            : inv.total_amount
        return sum + Math.max(0, restante)
      }, 0)
  }, [invoices])
  const hasRotativo = rotativo > 0
  // Estimativa simples da próxima fatura: rotativo + soma dos gastos não
  // pagos (faturas pending/reviewed). É só um indicador, não uma projeção
  // precisa de novos gastos futuros.
  const proximaFaturaEstimativa = useMemo(() => {
    return (
      rotativo +
      invoices
        .filter((inv) => inv.status !== 'paid' && inv.status !== 'partial')
        .reduce((s, inv) => s + inv.total_amount, 0)
    )
  }, [invoices, rotativo])

  const handleReparse = async (invId: string) => {
    setReparsingId(invId)
    setTimeoutErrorIds((prev) => {
      const next = new Set(prev)
      next.delete(invId)
      return next
    })
    try {
      await parseInvoice(invId)
      toast({ title: 'Processando fatura com IA...' })
    } catch (err) {
      if (err instanceof Error && err.message === 'TIMEOUT') {
        setTimeoutErrorIds((prev) => new Set(prev).add(invId))
      }
      const code = detectErrorCode(err)
      const config = getErrorConfig(code)
      toast({
        variant: 'destructive',
        title: config.title,
        description: config.body,
      })
    } finally {
      setReparsingId(null)
    }
  }

  useEffect(() => {
    if (!cardId) return
    setCardLoading(true)
    getCreditCard(cardId)
      .then(setCard)
      .catch(() => {})
      .finally(() => setCardLoading(false))
  }, [cardId])

  const usedLimit = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.total_amount, 0)
  const totalLimit = card?.credit_limit || 0
  const availableLimit = totalLimit - usedLimit
  const usedPercentage = totalLimit > 0 ? (usedLimit / totalLimit) * 100 : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cards')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Faturas do Cartão</h1>
      </div>

      {cardLoading ? (
        <Skeleton className="aspect-[1.6/1] max-w-sm rounded-2xl" />
      ) : card ? (
        <div className="max-w-sm">
          <CreditCardVisual card={card} ownerName={card.expand?.owner_id?.display_name} />
        </div>
      ) : null}

      {card && card.credit_limit != null && card.credit_limit > 0 && (
        <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Limite total</span>
              <span className="text-sm font-bold text-gray-900">
                {formatBRL(card.credit_limit)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Limite usado</span>
              <span className="text-sm font-bold text-orange-600">{formatBRL(usedLimit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Limite disponível</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatBRL(availableLimit)}
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  usedPercentage > 80
                    ? 'bg-red-500'
                    : usedPercentage > 50
                      ? 'bg-orange-500'
                      : 'bg-emerald-500',
                )}
                style={{ width: `${Math.min(usedPercentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saldo rotativo — aparece quando há faturas com pagamento parcial */}
      {hasRotativo && (
        <Card className="border-amber-200 dark:border-amber-900/50 shadow-subtle rounded-2xl bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Saldo rotativo
                </p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {formatBRL(rotativo)}
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300/80">
              Próxima fatura: previsão {formatBRL(proximaFaturaEstimativa)} (inclui rotativo + novos
              gastos)
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRotativoForm(true)}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              Parcelar rotativo
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-amber-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-sm text-amber-700">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma fatura cadastrada</p>
            <Button
              size="sm"
              onClick={() => setShowInvoiceForm(true)}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar fatura
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const monthDate = new Date(inv.month_ref.split(' ')[0] + 'T00:00:00')
            const status = invoiceStatusConfig[inv.status] || invoiceStatusConfig.pending
            const isSettled = inv.status === 'paid' || inv.status === 'partial'
            const rawParseStatus = getParseStatus(inv)
            // Se a fatura é paga ou parcial, não mostra badge nem mensagem de erro residual de parse
            const parseStatus =
              isSettled && (rawParseStatus === 'error' || rawParseStatus === 'processing')
                ? 'none'
                : rawParseStatus
            const parseConfig = parseStatusConfig[parseStatus]
            const hasTimeout =
              !isSettled && timeoutErrorIds.has(inv.id) && parseStatus === 'processing'
            const effectiveParseStatus: ParseStatus = isSettled
              ? 'none'
              : hasTimeout
                ? 'error'
                : parseStatus
            const effectiveParseConfig = hasTimeout ? parseStatusConfig.error : parseConfig
            const errorMessage = isSettled
              ? null
              : hasTimeout
                ? getErrorConfig('timeout').body
                : (inv.status === 'pending' || (inv.status as string) === 'processing') &&
                    effectiveParseStatus === 'error'
                  ? getErrorConfig(detectErrorCode(getParseError(inv))).body
                  : null
            return (
              <Card
                key={inv.id}
                onClick={() => navigate(`/cards/${cardId}/invoices/${inv.id}/review`)}
                className="border border-gray-100 shadow-subtle hover:shadow-elevation rounded-2xl bg-white cursor-pointer transition-all"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-[#166534]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">
                      {getMonthName(monthDate.getMonth())} {monthDate.getFullYear()}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge className={cn('text-xs', status.className)}>{status.label}</Badge>
                      {inv.status === 'partial' &&
                        inv.partial_amount != null &&
                        inv.partial_amount > 0 && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">
                            Pago {formatBRL(inv.partial_amount)}
                          </Badge>
                        )}
                      {effectiveParseStatus !== 'none' && (
                        <Badge
                          className={cn(
                            'text-xs flex items-center gap-0.5',
                            effectiveParseConfig.className,
                          )}
                        >
                          {effectiveParseStatus === 'processing' && (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          )}
                          {effectiveParseStatus === 'error' && (
                            <AlertCircle className="h-2.5 w-2.5" />
                          )}
                          {effectiveParseConfig.label}
                        </Badge>
                      )}
                      {effectiveParseStatus === 'error' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReparse(inv.id)
                          }}
                          disabled={reparsingId === inv.id}
                          className="text-xs text-red-600 font-semibold hover:text-red-700 disabled:opacity-50 flex items-center gap-0.5"
                        >
                          {reparsingId === inv.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-2.5 w-2.5" />
                          )}
                          Tentar novamente
                        </button>
                      )}
                    </div>
                    {errorMessage && <p className="text-xs text-amber-600 mt-1">{errorMessage}</p>}
                  </div>
                  <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
                    {formatBRL(inv.total_amount)}
                  </span>
                  {canDeleteInvoices && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget({
                          id: inv.id,
                          label: `${getMonthName(monthDate.getMonth())} ${monthDate.getFullYear()}`,
                        })
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      aria-label="Excluir fatura"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Link para Contas a Pagar — o pagamento de faturas agora acontece lá */}
      <Card className="border-blue-100 dark:border-blue-900/40 shadow-subtle rounded-2xl bg-blue-50/40 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <button
            onClick={() => navigate('/contas?tab=a_vencer')}
            className="flex items-center gap-3 w-full text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Ver em Contas a Pagar
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300/80">
                Pague suas faturas pelo fluxo de pagamento inteligente
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-300 shrink-0" />
          </button>
        </CardContent>
      </Card>

      {canImportInvoices && (
        <button
          onClick={() => setShowInvoiceForm(true)}
          className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {card && cardId && (
        <InvoiceFormSheet
          open={showInvoiceForm}
          onOpenChange={setShowInvoiceForm}
          cardId={cardId}
          familyId={card.family_id}
          onSaved={refetch}
        />
      )}

      {card && family && member && (
        <DebtFormSheet
          open={showRotativoForm}
          onOpenChange={setShowRotativoForm}
          familyId={family.id}
          ownerId={member.id}
          prefill={{
            type: 'credit_card',
            description: `Rotativo ${card.name}`,
            totalAmount: rotativo,
            remainingAmount: rotativo,
            // Sugere parcelamento em 12x como ponto de partida.
            installmentValue: rotativo > 0 ? Math.round((rotativo / 12) * 100) / 100 : 0,
            installmentsTotal: 12,
            notes: 'Saldo rotativo de cartão de crédito',
          }}
          onSaved={refetch}
        />
      )}

      <DeleteInvoiceDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        invoiceId={deleteTarget?.id ?? ''}
        monthLabel={deleteTarget?.label ?? ''}
        onSuccess={refetch}
      />
    </div>
  )
}
