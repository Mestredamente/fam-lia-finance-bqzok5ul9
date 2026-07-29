import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  Plus,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInvoices } from '@/hooks/use-invoices'
import { getCreditCard } from '@/services/credit-cards'
import { parseInvoice } from '@/services/invoices'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CreditCardVisual } from '@/components/CreditCardVisual'
import { InvoiceFormSheet } from '@/components/InvoiceFormSheet'
import { formatBRL, getMonthName, cn } from '@/lib/utils'
import { getParseStatus, type ParseStatus } from '@/lib/invoice-utils'
import { toast } from '@/hooks/use-toast'
import type { CreditCardRecord } from '@/types/finance'

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Revisada', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paga', className: 'bg-green-100 text-green-700' },
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
  const { invoices, loading, error, refetch } = useInvoices(cardId)
  const [card, setCard] = useState<CreditCardRecord | null>(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [reparsingId, setReparsingId] = useState<string | null>(null)

  const handleReparse = async (invId: string) => {
    setReparsingId(invId)
    try {
      await parseInvoice(invId)
      toast({ title: 'Processando fatura com IA...' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao processar fatura' })
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

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-red-600">{error}</p>
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
            const parseStatus = getParseStatus(inv)
            const parseConfig = parseStatusConfig[parseStatus]
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
                      <Badge className={cn('text-[9px]', status.className)}>{status.label}</Badge>
                      {parseStatus !== 'none' && (
                        <Badge
                          className={cn(
                            'text-[9px] flex items-center gap-0.5',
                            parseConfig.className,
                          )}
                        >
                          {parseStatus === 'processing' && (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          )}
                          {parseStatus === 'error' && <AlertCircle className="h-2.5 w-2.5" />}
                          {parseConfig.label}
                        </Badge>
                      )}
                      {parseStatus === 'error' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReparse(inv.id)
                          }}
                          disabled={reparsingId === inv.id}
                          className="text-[9px] text-red-600 font-semibold hover:text-red-700 disabled:opacity-50 flex items-center gap-0.5"
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
                  </div>
                  <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
                    {formatBRL(inv.total_amount)}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <button
        onClick={() => setShowInvoiceForm(true)}
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      {card && cardId && (
        <InvoiceFormSheet
          open={showInvoiceForm}
          onOpenChange={setShowInvoiceForm}
          cardId={cardId}
          familyId={card.family_id}
          onSaved={refetch}
        />
      )}
    </div>
  )
}
