import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  TrendingUp,
  HandCoins,
  CheckCircle2,
  Receipt,
  Loader2,
  Pencil,
  CreditCard,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useContasAPagar, buildBillPaymentPayload } from '@/hooks/use-contas-a-pagar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/EmptyState'
import { TransactionFormSheet, type TransactionPrefill } from '@/components/TransactionFormSheet'
import { InvestmentDetailSheet } from '@/components/InvestmentDetailSheet'
import { DebtDetailSheet } from '@/components/DebtDetailSheet'
import { InvoicePaymentDialog } from '@/components/InvoicePaymentDialog'
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
import pb from '@/lib/pocketbase/client'
import { getInvestmentsByFamilyId } from '@/services/investments'
import { getDebtsByFamilyId } from '@/services/debts'
import { formatBRL, cn } from '@/lib/utils'
import { usePrivacy } from '@/hooks/use-privacy'
import { toast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  BillItem,
  BillStatus,
  BillSource,
  InvestmentRecord,
  DebtRecord,
} from '@/types/finance'

type TabValue = 'a_vencer' | 'vencidas' | 'pagas' | 'todas'
type SourceFilterValue = 'all' | BillSource

const TAB_BY_QUERY: Record<string, TabValue> = {
  a_vencer: 'a_vencer',
  vencidas: 'vencidas',
  pagas: 'pagas',
  todas: 'todas',
}

const SOURCE_LABEL: Record<BillItem['source'], string> = {
  recurring: 'Recorrente',
  investment: 'Investimento',
  debt: 'Dívida',
  invoice: 'Fatura',
}

const SOURCE_ICON = {
  recurring: CalendarClock,
  investment: TrendingUp,
  debt: HandCoins,
  invoice: CreditCard,
} as const

const STATUS_DOT: Record<BillStatus, React.ReactNode> = {
  vencida: <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />,
  a_vencer: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />,
  partial: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />,
  futura: <span className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />,
  paga: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />,
}

function formatDatePtBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ContasAPagar() {
  const { family, member } = useAuth()
  const navigate = useNavigate()
  const { formatCurrency } = usePrivacy()
  const [searchParams, setSearchParams] = useSearchParams()
  const { contas, summary, loading, error, refetch } = useContasAPagar(family?.id)

  const queryTab = searchParams.get('tab')
  const initialTab = TAB_BY_QUERY[queryTab || ''] || 'a_vencer'
  const [tab, setTab] = useState<TabValue>(initialTab)
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>('all')

  // Keep the active tab in sync with the URL (so dashboard alerts can deep-link).
  useEffect(() => {
    const next = TAB_BY_QUERY[searchParams.get('tab') || '']
    if (next && next !== tab) setTab(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const onTabChange = (value: string) => {
    const v = value as TabValue
    setTab(v)
    const params = new URLSearchParams(searchParams)
    if (v === 'a_vencer') params.delete('tab')
    else params.set('tab', v)
    setSearchParams(params, { replace: true })
  }

  // ── "Pagar agora" sheet ──
  const [paySheetOpen, setPaySheetOpen] = useState(false)
  const [payPrefill, setPayPrefill] = useState<TransactionPrefill | null>(null)

  // ── Invoice payment dialog (card invoice flow) ──
  const [invoicePayOpen, setInvoicePayOpen] = useState(false)
  const [invoicePayBill, setInvoicePayBill] = useState<BillItem | null>(null)

  // ── Detail sheets ──
  const [detailInv, setDetailInv] = useState<InvestmentRecord | null>(null)
  const [showInvDetail, setShowInvDetail] = useState(false)
  const [detailDebt, setDetailDebt] = useState<DebtRecord | null>(null)
  const [showDebtDetail, setShowDebtDetail] = useState(false)

  // ── Delete confirmation ──
  const [billToDelete, setBillToDelete] = useState<BillItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Pending pay action per item (avoids duplicate creates on double-click).
  const [payingId, setPayingId] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      a_vencer: contas.filter(
        (c) => c.status === 'a_vencer' || c.status === 'futura' || c.status === 'partial',
      ).length,
      vencidas: contas.filter((c) => c.status === 'vencida').length,
      pagas: contas.filter((c) => c.status === 'paga').length,
      todas: contas.length,
    }),
    [contas],
  )

  const visible = useMemo(() => {
    let list = contas
    switch (tab) {
      case 'a_vencer':
        list = contas.filter(
          (c) => c.status === 'a_vencer' || c.status === 'futura' || c.status === 'partial',
        )
        break
      case 'vencidas':
        list = contas.filter((c) => c.status === 'vencida')
        break
      case 'pagas':
        list = contas.filter((c) => c.status === 'paga')
        break
      default:
        list = contas
        break
    }

    if (sourceFilter !== 'all') {
      list = list.filter((c) => c.source === sourceFilter)
    }

    return list
  }, [tab, sourceFilter, contas])

  // Group visible bills into the 4 layout sections (vencidas, esta semana,
  // próximas, pagas este mês). Only render non-empty sections.
  const groups = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const horizon = new Date(today)
    horizon.setDate(horizon.getDate() + 7)

    const vencidas: BillItem[] = []
    const estaSemana: BillItem[] = []
    const proximas: BillItem[] = []
    const pagas: BillItem[] = []

    for (const c of visible) {
      if (c.status === 'paga') {
        pagas.push(c)
        continue
      }
      const due = new Date(c.dueDate)
      const d = new Date(due.getFullYear(), due.getMonth(), due.getDate())
      if (c.status === 'vencida') {
        vencidas.push(c)
      } else if (d <= horizon) {
        estaSemana.push(c)
      } else {
        proximas.push(c)
      }
    }
    return { vencidas, estaSemana, proximas, pagas }
  }, [visible])

  const handleMarkPaid = useCallback(
    async (bill: BillItem) => {
      if (!family || !member) return
      // Invoices go through the dedicated payment dialog (total / minimum /
      // other) instead of a straight "mark as paid".
      if (bill.source === 'invoice') {
        setInvoicePayBill(bill)
        setInvoicePayOpen(true)
        return
      }
      if (bill.transactionId) {
        toast({ title: 'Esta conta já está paga' })
        return
      }
      const payload = buildBillPaymentPayload(bill, family.id, member.id)
      if (!payload) {
        toast({ title: 'Esta conta já está paga' })
        refetch()
        return
      }
      setPayingId(bill.id)
      try {
        await pb.collection('transactions').create(payload)
        toast({ title: 'Conta marcada como paga' })
        await refetch()
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao marcar conta',
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        setPayingId(null)
      }
    },
    [family, member, refetch],
  )

  const handlePayNow = useCallback((bill: BillItem) => {
    setPayPrefill({
      type: bill.type,
      amount: bill.remainingAmount ?? bill.amount,
      description: bill.description,
      categoryId: bill.categoryId ?? null,
      originId: bill.originId,
      source:
        bill.source === 'recurring'
          ? 'recurring'
          : bill.source === 'investment'
            ? 'investment'
            : bill.source === 'invoice'
              ? 'invoice_import'
              : 'recurring_debt',
      debtId: bill.source === 'debt' ? bill.originId : null,
      recurringId: bill.source === 'recurring' ? bill.originId : null,
      investmentId: bill.source === 'investment' ? bill.originId : null,
      invoiceId: bill.source === 'invoice' ? bill.invoiceId || bill.originId : null,
      cardId: bill.cardId || null,
    })
    setPaySheetOpen(true)
  }, [])

  const handleViewDetail = useCallback(
    async (bill: BillItem) => {
      try {
        if (bill.source === 'investment') {
          // Fetch the full investment record (the bills list carries only the
          // bill-shaped projection). Reuse the family-scoped service.
          const all = await getInvestmentsByFamilyId(family!.id)
          const inv = all.find((i) => i.id === bill.originId) || null
          setDetailInv(inv)
          setShowInvDetail(true)
        } else if (bill.source === 'debt') {
          const all = await getDebtsByFamilyId(family!.id)
          const debt = all.find((d) => d.id === bill.originId) || null
          setDetailDebt(debt)
          setShowDebtDetail(true)
        } else {
          // Recorrentes have no detail sheet — send to the Recorrentes page.
          navigate('/recorrentes')
        }
      } catch {
        toast({ variant: 'destructive', title: 'Não foi possível carregar o detalhe' })
      }
    },
    [family, navigate],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!billToDelete) return
    setDeleting(true)
    try {
      if (billToDelete.source === 'recurring') {
        await pb
          .collection('recurring_transactions')
          .update(billToDelete.originId, { active: false })
        toast({ title: 'Recorrente desativada. Não gerará mais contas.' })
      } else if (billToDelete.source === 'debt') {
        await pb
          .collection('debts')
          .update(billToDelete.originId, { status: 'cancelled', is_active: false })
        toast({ title: 'Dívida cancelada.' })
      } else if (billToDelete.source === 'investment') {
        await pb.collection('investments').update(billToDelete.originId, { is_active: false })
        toast({ title: 'Investimento concluído.' })
      }
      setBillToDelete(null)
      await refetch()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }, [billToDelete, refetch])

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#166534]">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
            Contas a Pagar
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe seus vencimentos</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Este mês" value={formatCurrency(summary.totalMes)} tone="default" />
        <SummaryCard
          label="Já pagas"
          value={formatCurrency(summary.totalPagas)}
          sub={summary.countPagas > 0 ? `${summary.countPagas} conta(s)` : undefined}
          tone="paid"
        />
        <SummaryCard
          label="Restante"
          value={formatCurrency(summary.totalRestante)}
          sub={summary.countRestante > 0 ? `${summary.countRestante} conta(s)` : undefined}
          tone="default"
        />
        <SummaryCard
          label="Vencidas"
          value={formatCurrency(summary.totalVencidas)}
          sub={summary.countVencidas > 0 ? `${summary.countVencidas} conta(s)` : undefined}
          tone={summary.countVencidas > 0 ? 'overdue' : 'default'}
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto h-auto">
            <TabsTrigger value="a_vencer" className="gap-1.5">
              A vencer <CountBadge n={counts.a_vencer} />
            </TabsTrigger>
            <TabsTrigger value="vencidas" className="gap-1.5">
              Vencidas <CountBadge n={counts.vencidas} tone="overdue" />
            </TabsTrigger>
            <TabsTrigger value="pagas" className="gap-1.5">
              Pagas <CountBadge n={counts.pagas} tone="paid" />
            </TabsTrigger>
            <TabsTrigger value="todas" className="gap-1.5">
              Todas <CountBadge n={counts.todas} />
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtro por Origem (Segunda linha de filtros) */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { value: 'all' as const, label: 'Todas as origens' },
              { value: 'recurring' as const, label: 'Recorrentes' },
              { value: 'invoice' as const, label: 'Faturas' },
              { value: 'debt' as const, label: 'Dívidas' },
              { value: 'investment' as const, label: 'Investimentos' },
            ].map((sf) => {
              const active = sourceFilter === sf.value
              return (
                <button
                  key={sf.value}
                  type="button"
                  onClick={() => setSourceFilter(sf.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                    active
                      ? 'bg-emerald-100 text-[#166534] dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-xs'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                  )}
                >
                  {sf.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <CardContent className="p-4">
            <EmptyState
              icon={<CalendarClock className="h-16 w-16" />}
              title="Nenhuma conta neste filtro"
              description="Cadastre contas recorrentes, investimentos parcelados ou dívidas para vê-las aqui."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <BillGroup
            title="Vencidas"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-red-500" />}
            items={groups.vencidas}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
            onDelete={(bill) => setBillToDelete(bill)}
          />
          <BillGroup
            title="Esta semana"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
            items={groups.estaSemana}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
            onDelete={(bill) => setBillToDelete(bill)}
          />
          <BillGroup
            title="Próximas"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-gray-300" />}
            items={groups.proximas}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
            onDelete={(bill) => setBillToDelete(bill)}
          />
          <BillGroup
            title="Pagas este mês"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
            items={groups.pagas}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
            onDelete={(bill) => setBillToDelete(bill)}
            readonly
          />
        </div>
      )}

      {/* Pagar agora sheet */}
      <TransactionFormSheet
        open={paySheetOpen}
        onOpenChange={setPaySheetOpen}
        familyId={family.id}
        ownerId={member?.id || ''}
        onSaved={refetch}
        prefill={payPrefill}
      />

      {/* Invoice payment dialog (total / mínimo / outro valor) */}
      <InvoicePaymentDialog
        bill={invoicePayBill}
        open={invoicePayOpen}
        onOpenChange={setInvoicePayOpen}
        familyId={family.id}
        ownerId={member?.id || ''}
        onPaid={refetch}
      />

      {/* Detail sheets */}
      <InvestmentDetailSheet
        investment={detailInv}
        open={showInvDetail}
        onOpenChange={setShowInvDetail}
        isOwner={detailInv?.owner_id === member?.id}
        onEdit={() => {}}
        onDelete={async () => {
          if (!detailInv) return
          try {
            await pb.collection('investments').delete(detailInv.id)
            toast({ title: 'Investimento excluído' })
            setShowInvDetail(false)
            refetch()
          } catch {
            toast({ variant: 'destructive', title: 'Erro ao excluir' })
          }
        }}
      />
      <DebtDetailSheet
        debt={detailDebt}
        open={showDebtDetail}
        onOpenChange={setShowDebtDetail}
        isOwner={detailDebt?.owner_id === member?.id}
        onEdit={() => {}}
        onDelete={async () => {
          if (!detailDebt) return
          try {
            await pb.collection('debts').delete(detailDebt.id)
            toast({ title: 'Dívida excluída' })
            setShowDebtDetail(false)
            refetch()
          } catch {
            toast({ variant: 'destructive', title: 'Erro ao excluir' })
          }
        }}
        onRegisterPayment={async () => {
          if (!detailDebt) return
          await handleMarkPaid({
            id: `debt-${detailDebt.id}`,
            description: detailDebt.description,
            amount: detailDebt.installment_value,
            dueDate: new Date().toISOString(),
            source: 'debt',
            status: 'a_vencer',
            originId: detailDebt.id,
            extraInfo:
              detailDebt.installments_total > 0
                ? `Parcela ${detailDebt.installments_paid + 1}/${detailDebt.installments_total}`
                : undefined,
            categoryId: detailDebt.category_id || undefined,
            type: 'expense',
          })
          setShowDebtDetail(false)
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={Boolean(billToDelete)}
        onOpenChange={(open) => {
          if (!open) setBillToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {billToDelete?.source === 'recurring'
                ? 'Excluir conta recorrente?'
                : billToDelete?.source === 'debt'
                  ? 'Cancelar esta dívida?'
                  : 'Concluir este investimento?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {billToDelete?.source === 'recurring' &&
                'Excluir esta conta recorrente? Ela não gerará mais transações futuras. Transações já criadas não serão afetadas.'}
              {billToDelete?.source === 'debt' &&
                'Cancelar esta dívida? Ela não aparecerá mais em Contas a Pagar. Parcelas já pagas permanecem no histórico.'}
              {billToDelete?.source === 'investment' &&
                'Concluir este investimento? Ele não aparecerá mais em Contas a Pagar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Sub-components ──

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: 'default' | 'paid' | 'overdue'
}) {
  const valueColor =
    tone === 'overdue'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'paid'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-gray-900 dark:text-foreground'
  return (
    <Card className="border border-gray-100 dark:border-gray-800 shadow-subtle rounded-2xl bg-white dark:bg-card">
      <CardContent className="p-3.5 space-y-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400 block">{label}</span>
        <span className={cn('text-base font-extrabold', valueColor)}>{value}</span>
        {sub && <span className="text-[11px] text-gray-400 block">{sub}</span>}
      </CardContent>
    </Card>
  )
}

function CountBadge({ n, tone }: { n: number; tone?: 'overdue' | 'paid' }) {
  if (n === 0) return null
  const cls =
    tone === 'overdue'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : tone === 'paid'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  return (
    <span
      className={cn(
        'ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
        cls,
      )}
    >
      {n}
    </span>
  )
}

function BillGroup({
  title,
  dot,
  items,
  payingId,
  onMarkPaid,
  onPayNow,
  onViewDetail,
  onDelete,
  readonly,
}: {
  title: string
  dot: React.ReactNode
  items: BillItem[]
  payingId: string | null
  onMarkPaid: (bill: BillItem) => void
  onPayNow: (bill: BillItem) => void
  onViewDetail: (bill: BillItem) => void
  onDelete: (bill: BillItem) => void
  readonly?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        {dot}
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-[11px] text-gray-400">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((bill) => (
          <BillRow
            key={bill.id}
            bill={bill}
            paying={payingId === bill.id}
            onMarkPaid={() => onMarkPaid(bill)}
            onPayNow={() => onPayNow(bill)}
            onViewDetail={() => onViewDetail(bill)}
            onDelete={() => onDelete(bill)}
            readonly={readonly}
          />
        ))}
      </div>
    </div>
  )
}

function BillRow({
  bill,
  paying,
  onMarkPaid,
  onPayNow,
  onViewDetail,
  onDelete,
  readonly,
}: {
  bill: BillItem
  paying: boolean
  onMarkPaid: () => void
  onPayNow: () => void
  onViewDetail: () => void
  onDelete: () => void
  readonly?: boolean
}) {
  const { formatCurrency } = usePrivacy()
  const Icon = SOURCE_ICON[bill.source]
  const isIncome = bill.type === 'income'
  const amountColor = isIncome ? 'text-emerald-600' : 'text-gray-900 dark:text-foreground'
  const isPaid = bill.status === 'paga'
  const isPartial = bill.status === 'partial'
  const isInvoice = bill.source === 'invoice'
  const isOverdueInvoice = isInvoice && bill.status === 'vencida'
  const daysOverdue = useMemo(() => {
    if (!isOverdueInvoice) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(bill.dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.max(1, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
  }, [isOverdueInvoice, bill.dueDate])

  return (
    <Card
      className={cn(
        'border border-gray-100 dark:border-gray-800 shadow-subtle rounded-2xl bg-white dark:bg-card',
        bill.status === 'vencida' && 'border-red-200 dark:border-red-900/50',
        isPaid && 'opacity-70',
      )}
    >
      <CardContent className="p-3.5 flex items-center gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            bill.source === 'recurring'
              ? 'bg-indigo-50 text-indigo-600'
              : bill.source === 'investment'
                ? 'bg-violet-50 text-violet-600'
                : isInvoice
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-red-50 text-red-600',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
              {bill.description}
            </p>
            {isInvoice ? (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-[10px] py-0 px-1.5 gap-1 font-semibold">
                <CreditCard className="h-2.5 w-2.5" />
                Fatura
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {SOURCE_LABEL[bill.source]}
              </Badge>
            )}
            {bill.cardName && isInvoice && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                ({bill.cardName})
              </span>
            )}
            {isOverdueInvoice && (
              <Badge
                className={cn(
                  'text-[10px] py-0 px-1.5 font-bold border-0',
                  daysOverdue > 30
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                )}
              >
                Vencida há {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}
              </Badge>
            )}
            {isPartial ? (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0 text-[10px] py-0 px-1.5 font-bold">
                Parcialmente paga
              </Badge>
            ) : (
              bill.extraInfo && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                  {bill.extraInfo}
                </Badge>
              )
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {STATUS_DOT[bill.status]}
            <span>
              {isPaid
                ? `Paga em ${bill.paidDate ? formatDatePtBR(bill.paidDate) : '—'}`
                : isPartial
                  ? `Vencimento ${formatDatePtBR(bill.dueDate)} (restante pendente)`
                  : bill.status === 'vencida'
                    ? `Venceu em ${formatDatePtBR(bill.dueDate)}`
                    : `Vence em ${formatDatePtBR(bill.dueDate)}`}
            </span>
          </div>
          {/* Invoice: show the minimum payment & partial payment breakdown */}
          {isInvoice && isPartial && (
            <div className="mt-1 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
              <div>
                Total:{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCurrency(bill.amount)}
                </span>
                {bill.partialAmount != null && bill.partialAmount > 0 && (
                  <>
                    {' · '}
                    Pago:{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(bill.partialAmount)}
                    </span>
                  </>
                )}
              </div>
              {bill.remainingAmount != null && (
                <div>
                  Restante:{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(bill.remainingAmount)}
                  </span>
                </div>
              )}
            </div>
          )}
          {isInvoice && !isPartial && typeof bill.minimumPayment === 'number' && (
            <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Mínimo:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatCurrency(bill.minimumPayment)}
              </span>
            </div>
          )}
          {isOverdueInvoice && (
            <div className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
              Esta fatura está vencida. Pagar agora ou ver opções?
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('font-bold text-sm whitespace-nowrap', amountColor)}>
            {isIncome ? '+ ' : '- '}
            {isPartial && bill.remainingAmount != null
              ? formatCurrency(bill.remainingAmount)
              : formatCurrency(bill.amount)}
          </span>
          {isPartial && bill.remainingAmount != null && (
            <span className="text-[10px] text-gray-400">restante</span>
          )}
          {isPaid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : readonly ? null : isInvoice ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkPaid}
              disabled={paying}
              className="h-7 px-3 text-xs"
            >
              {paying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CreditCard className="h-3 w-3" />
              )}
              Pagar
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkPaid}
                disabled={paying}
                className="h-7 px-2 text-xs"
              >
                {paying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Marcar como paga</span>
                <span className="sm:hidden">Pagar</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onPayNow}
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                aria-label="Pagar agora"
                title="Pagar agora"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {(bill.source === 'investment' || bill.source === 'debt') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onViewDetail}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                  aria-label="Ver detalhe"
                  title="Ver detalhe"
                >
                  <Receipt className="h-3.5 w-3.5" />
                </Button>
              )}
              {bill.source !== 'invoice' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  aria-label="Excluir"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
