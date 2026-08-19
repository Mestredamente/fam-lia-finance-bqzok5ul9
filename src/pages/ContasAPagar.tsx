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
import pb from '@/lib/pocketbase/client'
import { getInvestmentsByFamilyId } from '@/services/investments'
import { getDebtsByFamilyId } from '@/services/debts'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { BillItem, BillStatus, InvestmentRecord, DebtRecord } from '@/types/finance'

type TabValue = 'a_vencer' | 'vencidas' | 'pagas' | 'todas'

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
}

const SOURCE_ICON = {
  recurring: CalendarClock,
  investment: TrendingUp,
  debt: HandCoins,
} as const

const STATUS_DOT: Record<BillStatus, React.ReactNode> = {
  vencida: <span className="w-2.5 h-2.5 rounded-full bg-red-500" />,
  a_vencer: <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />,
  futura: <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />,
  paga: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />,
}

function formatDatePtBR(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function ContasAPagar() {
  const { family, member } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { contas, summary, loading, error, refetch } = useContasAPagar(family?.id)

  const queryTab = searchParams.get('tab')
  const initialTab = TAB_BY_QUERY[queryTab || ''] || 'a_vencer'
  const [tab, setTab] = useState<TabValue>(initialTab)

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

  // ── Detail sheets ──
  const [detailInv, setDetailInv] = useState<InvestmentRecord | null>(null)
  const [showInvDetail, setShowInvDetail] = useState(false)
  const [detailDebt, setDetailDebt] = useState<DebtRecord | null>(null)
  const [showDebtDetail, setShowDebtDetail] = useState(false)

  // Pending pay action per item (avoids duplicate creates on double-click).
  const [payingId, setPayingId] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      a_vencer: contas.filter((c) => c.status === 'a_vencer').length,
      vencidas: contas.filter((c) => c.status === 'vencida').length,
      pagas: contas.filter((c) => c.status === 'paga').length,
      todas: contas.length,
    }),
    [contas],
  )

  const visible = useMemo(() => {
    switch (tab) {
      case 'a_vencer':
        return contas.filter((c) => c.status === 'a_vencer' || c.status === 'vencida')
      case 'vencidas':
        return contas.filter((c) => c.status === 'vencida')
      case 'pagas':
        return contas.filter((c) => c.status === 'paga')
      default:
        return contas
    }
  }, [tab, contas])

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
      amount: bill.amount,
      description: bill.description,
      categoryId: bill.categoryId ?? null,
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
        <SummaryCard label="Este mês" value={formatBRL(summary.totalMes)} tone="default" />
        <SummaryCard
          label="Já pagas"
          value={formatBRL(summary.totalPagas)}
          sub={summary.countPagas > 0 ? `${summary.countPagas} conta(s)` : undefined}
          tone="paid"
        />
        <SummaryCard
          label="Restante"
          value={formatBRL(summary.totalRestante)}
          sub={summary.countRestante > 0 ? `${summary.countRestante} conta(s)` : undefined}
          tone="default"
        />
        <SummaryCard
          label="Vencidas"
          value={formatBRL(summary.totalVencidas)}
          sub={summary.countVencidas > 0 ? `${summary.countVencidas} conta(s)` : undefined}
          tone={summary.countVencidas > 0 ? 'overdue' : 'default'}
        />
      </div>

      {/* Filters */}
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
          />
          <BillGroup
            title="Esta semana"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
            items={groups.estaSemana}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
          />
          <BillGroup
            title="Próximas"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-gray-300" />}
            items={groups.proximas}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
          />
          <BillGroup
            title="Pagas este mês"
            dot={<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
            items={groups.pagas}
            payingId={payingId}
            onMarkPaid={handleMarkPaid}
            onPayNow={handlePayNow}
            onViewDetail={handleViewDetail}
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
  readonly,
}: {
  title: string
  dot: React.ReactNode
  items: BillItem[]
  payingId: string | null
  onMarkPaid: (bill: BillItem) => void
  onPayNow: (bill: BillItem) => void
  onViewDetail: (bill: BillItem) => void
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
  readonly,
}: {
  bill: BillItem
  paying: boolean
  onMarkPaid: () => void
  onPayNow: () => void
  onViewDetail: () => void
  readonly?: boolean
}) {
  const Icon = SOURCE_ICON[bill.source]
  const isIncome = bill.type === 'income'
  const amountColor = isIncome ? 'text-emerald-600' : 'text-gray-900 dark:text-foreground'
  const isPaid = bill.status === 'paga'

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
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {SOURCE_LABEL[bill.source]}
            </Badge>
            {bill.extraInfo && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {bill.extraInfo}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {STATUS_DOT[bill.status]}
            <span>
              {isPaid
                ? `Paga em ${bill.paidDate ? formatDatePtBR(bill.paidDate) : '—'}`
                : bill.status === 'vencida'
                  ? `Venceu em ${formatDatePtBR(bill.dueDate)}`
                  : `Vence em ${formatDatePtBR(bill.dueDate)}`}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('font-bold text-sm whitespace-nowrap', amountColor)}>
            {isIncome ? '+ ' : '- '}
            {formatBRL(bill.amount)}
          </span>
          {isPaid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : readonly ? null : (
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
