import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  Calendar,
  Receipt,
  FileDown,
  Upload,
  Trash2,
  Filter,
  CloudOff,
  Repeat,
  Layers,
  CalendarDays,
  Landmark,
  Settings,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useTransactions } from '@/hooks/use-transactions'
import { useBudgets } from '@/hooks/use-budgets'
import { getActiveMembersByFamilyId } from '@/services/members'
import { deleteTransaction } from '@/services/transactions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { TransactionFormSheet, EMOTION_META } from '@/components/TransactionFormSheet'
import { TransactionDetailSheet } from '@/components/TransactionDetailSheet'
import { RecurringTransactionFormSheet } from '@/components/RecurringTransactionFormSheet'
import { ExportButton } from '@/components/ExportButton'
import { BankImportSheet } from '@/components/BankImportSheet'
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions'
import { useIsMobile } from '@/hooks/use-mobile'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { generateMonthlyPDF } from '@/lib/pdf-report'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type {
  TransactionRecord,
  MemberRecord,
  TransactionEmotion,
  RecurringTransaction,
} from '@/types/finance'

const EMOTION_FILTERS: { value: TransactionEmotion; label: string; emoji: string }[] = [
  { value: 'happy', label: 'Feliz', emoji: '😊' },
  { value: 'necessary', label: 'Necessário', emoji: '✅' },
  { value: 'neutral', label: 'Neutro', emoji: '😐' },
  { value: 'regret', label: 'Arrependido', emoji: '😬' },
  { value: 'impulsive', label: 'Impulsivo', emoji: '😤' },
]

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

type SourceFilter = 'all' | 'once' | 'recurring' | 'installment' | 'debt'

const SOURCE_OPTIONS: {
  value: SourceFilter
  label: string
  icon: LucideIcon
}[] = [
  { value: 'all', label: 'Todas', icon: CalendarDays },
  { value: 'once', label: 'Avulsas', icon: Receipt },
  { value: 'recurring', label: 'Recorrentes', icon: Repeat },
  { value: 'installment', label: 'Parceladas', icon: Layers },
  { value: 'debt', label: 'Dívidas', icon: Landmark },
]

function groupByDay(items: TransactionRecord[]) {
  const groups: Record<string, TransactionRecord[]> = {}
  for (const t of items) {
    const key = t.transaction_date.split(' ')[0].split('T')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function Transactions() {
  const navigate = useNavigate()
  const { family, member } = useAuth()
  const perms = usePermissions()
  const canDeleteTransactions = perms.canDeleteTransactions()
  const isMobile = useIsMobile()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Applied filters (drive the list)
  const [memberFilter, setMemberFilter] = useState('all')
  const [emotionFilter, setEmotionFilter] = useState<TransactionEmotion | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  // Pending filters (edited inside the panel, committed on "Aplicar")
  const [pendingMember, setPendingMember] = useState('all')
  const [pendingEmotion, setPendingEmotion] = useState<TransactionEmotion | 'all'>('all')
  const [pendingSource, setPendingSource] = useState<SourceFilter>('all')

  const [showFilters, setShowFilters] = useState(false)
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [detailTx, setDetailTx] = useState<TransactionRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [deleteTx, setDeleteTx] = useState<TransactionRecord | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRecurringEditDialog, setShowRecurringEditDialog] = useState(false)
  const [recurringEditTx, setRecurringEditTx] = useState<TransactionRecord | null>(null)
  const [recurringChoice, setRecurringChoice] = useState<'once' | 'future'>('once')
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const { transactions, setTransactions, loading, error, refetch } = useTransactions(
    family?.id,
    year,
    month,
  )
  const { budgets } = useBudgets(family?.id)
  const { recurring, refetch: refetchRecurring } = useRecurringTransactions(family?.id)

  // Map of category_id → progress percentage for budgets that reached ≥80%,
  // used to surface a small alert dot next to the category name on expense rows.
  const alertByCategory = useMemo(() => {
    const map: Record<string, { pct: number; exceeded: boolean }> = {}
    for (const b of budgets) {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === b.category_id &&
            (!b.member_id || t.owner_id === b.member_id),
        )
        .reduce((s, t) => s + t.amount, 0)
      const pct = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0
      if (pct >= 80) {
        map[b.category_id] = { pct, exceeded: spent >= b.monthly_limit }
      }
    }
    return map
  }, [budgets, transactions])

  useEffect(() => {
    if (family)
      getActiveMembersByFamilyId(family.id)
        .then(setMembers)
        .catch(() => {})
  }, [family?.id])

  const activeFilterCount =
    (sourceFilter !== 'all' ? 1 : 0) +
    (memberFilter !== 'all' ? 1 : 0) +
    (emotionFilter !== 'all' ? 1 : 0)

  const filtered = transactions.filter((t) => {
    if (memberFilter !== 'all' && t.owner_id !== memberFilter) return false
    if (emotionFilter !== 'all' && t.emotion !== emotionFilter) return false
    if (sourceFilter === 'once') {
      if (t.recurring_id || t.is_installment) return false
    } else if (sourceFilter === 'recurring') {
      if (!t.recurring_id) return false
    } else if (sourceFilter === 'installment') {
      if (!t.is_installment) return false
    } else if (sourceFilter === 'debt') {
      return !!t.debt_id || t.source === 'debt_payment' || t.source === 'recurring_debt'
    }
    return true
  })
  const grouped = groupByDay(filtered)

  // Cascade deletion is handled automatically by the backend
  // (onRecordAfterDeleteRequest hook on `transactions`). The frontend just
  // deletes the clicked record; if it is a parcelada "mãe", its filhas are
  // removed server-side. We optimistically drop the visible children too.
  const handleDelete = async () => {
    if (!detailTx) return
    const prev = transactions
    const motherId = detailTx.parent_transaction_id || detailTx.id
    const idsToRemove = new Set<string>([detailTx.id])
    // If the deleted record is a mother (children point to it), drop children
    // from the local view as well — the backend cascades them silently.
    if (!detailTx.parent_transaction_id) {
      prev.forEach((t) => {
        if (t.parent_transaction_id === detailTx.id) idsToRemove.add(t.id)
      })
    }
    setTransactions(prev.filter((t) => !idsToRemove.has(t.id)))
    setShowDetail(false)
    try {
      await deleteTransaction(detailTx.id)
      toast({
        title: 'Transação excluída',
        description:
          motherId !== detailTx.id || idsToRemove.size > 1
            ? `${idsToRemove.size} transação(ões) removida(s)`
            : undefined,
      })
    } catch {
      setTransactions(prev)
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir transação' })
    }
  }

  const handleRowDelete = async () => {
    if (!deleteTx) return
    const prev = transactions
    const idsToRemove = new Set<string>([deleteTx.id])
    if (!deleteTx.parent_transaction_id) {
      prev.forEach((t) => {
        if (t.parent_transaction_id === deleteTx.id) idsToRemove.add(t.id)
      })
    }
    setTransactions(prev.filter((t) => !idsToRemove.has(t.id)))
    setShowDeleteDialog(false)
    try {
      await deleteTransaction(deleteTx.id)
      toast({ title: 'Transação excluída' })
    } catch {
      setTransactions(prev)
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir transação' })
    }
  }

  const openFilters = () => {
    // sync pending state with applied state when opening
    setPendingMember(memberFilter)
    setPendingEmotion(emotionFilter)
    setPendingSource(sourceFilter)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setMemberFilter(pendingMember)
    setEmotionFilter(pendingEmotion)
    setSourceFilter(pendingSource)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setPendingMember('all')
    setPendingEmotion('all')
    setPendingSource('all')
  }

  const openForm = () => {
    setEditingTx(null)
    setShowForm(true)
  }
  const openEdit = () => {
    if (detailTx && (detailTx.recurring_id || detailTx.source === 'recurring')) {
      setRecurringEditTx(detailTx)
      setRecurringChoice('once')
      setShowRecurringEditDialog(true)
      setShowDetail(false)
      return
    }
    setEditingTx(detailTx)
    setShowDetail(false)
    setShowForm(true)
  }

  const handleRecurringEditChoice = () => {
    setShowRecurringEditDialog(false)
    if (recurringChoice === 'once') {
      setEditingTx(recurringEditTx)
      setShowForm(true)
    } else {
      const rid = recurringEditTx?.recurring_id
      const found = rid ? recurring.find((r) => r.id === rid) || null : null
      setEditingRecurring(found)
      setShowRecurringForm(true)
    }
  }

  if (!family)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando...</p>
      </div>
    )

  const filtersPanel = (
    <div className="space-y-5">
      {/* Tipo */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Tipo
        </p>
        <RadioGroup
          value={pendingSource}
          onValueChange={(v) => setPendingSource(v as SourceFilter)}
          className="grid grid-cols-3 gap-2"
        >
          {SOURCE_OPTIONS.map((f) => (
            <Label
              key={f.value}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-accent text-sm',
                pendingSource === f.value && 'border-[#166534] bg-[#166534]/5',
              )}
            >
              <RadioGroupItem value={f.value} id={`src-${f.value}`} className="sr-only" />
              <f.icon className="h-4 w-4 shrink-0" />
              <span>{f.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Usuário — sempre dinâmico da lista de membros */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Usuário
        </p>
        <RadioGroup
          value={pendingMember}
          onValueChange={setPendingMember}
          className="grid grid-cols-2 gap-2"
        >
          <Label
            className={cn(
              'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-accent text-sm',
              pendingMember === 'all' && 'border-[#166534] bg-[#166534]/5',
            )}
          >
            <RadioGroupItem value="all" id="usr-all" className="sr-only" />
            <span>Todos</span>
          </Label>
          {members.map((m) => (
            <Label
              key={m.id}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-accent text-sm',
                pendingMember === m.id && 'border-[#166534] bg-[#166534]/5',
              )}
            >
              <RadioGroupItem value={m.id} id={`usr-${m.id}`} className="sr-only" />
              <span className="truncate">{m.display_name}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Emoção */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Emoção
        </p>
        <Select
          value={pendingEmotion}
          onValueChange={(v) => setPendingEmotion(v as TransactionEmotion | 'all')}
        >
          <SelectTrigger className="w-full h-9 rounded-lg px-3 py-1.5 text-sm">
            <SelectValue placeholder="Todas emoções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas emoções</SelectItem>
            {EMOTION_FILTERS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                <span className="mr-1">{e.emoji}</span> {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {recurring.filter((r) => r.active).length > 0 && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm text-gray-600 hover:text-gray-900"
            onClick={() => {
              setShowFilters(false)
              navigate('/recorrentes')
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar recorrentes
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={clearFilters}>
          Limpar filtros
        </Button>
        <Button className="flex-1 bg-[#166534] hover:bg-[#15803D]" onClick={applyFilters}>
          Aplicar
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ÚNICA linha de controles no topo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">Transações</h1>
        <div className="flex flex-wrap items-center gap-2">
          {perms.canImportInvoices() && (
            <Button
              variant="secondary"
              onClick={() => setShowImport(true)}
              className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
          )}
          <ExportButton
            transactions={filtered}
            month={month}
            year={year}
            familyName={family.name}
            members={members}
          />
          <Button
            variant="secondary"
            onClick={() => generateMonthlyPDF(filtered, month, year)}
            className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Relatório</span>
          </Button>

          {/* Navegação de mês */}
          <div className="flex items-center gap-1 ml-1">
            <Button
              variant="secondary"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="h-9 w-9 p-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[110px] text-center">
              {MONTHS[month]} {year}
            </span>
            <Button
              variant="secondary"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="h-9 w-9 p-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Botão Filtros — Sheet no mobile, Popover no desktop */}
          {isMobile ? (
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <Button
                variant="secondary"
                onClick={openFilters}
                className="relative h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#166534] text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
          ) : (
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  onClick={openFilters}
                  className="relative h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#166534] text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4">
                {filtersPanel}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Carregando" aria-busy="true">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-danger">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <Receipt className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Nenhuma transação neste mês
            </p>
            <Button size="sm" onClick={openForm} className="bg-[#166534] hover:bg-[#15803D]">
              Adicionar transação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6" role="list">
          {grouped.map(([date, items]) => {
            const d = new Date(date + 'T00:00:00')
            return (
              <div key={date} className="space-y-2">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {d.getDate()} de {MONTHS[d.getMonth()]}
                </h2>
                {items.map((t) => {
                  const cat = t.expand?.category_id
                  const Icon = getCategoryIcon(cat?.icon || 'plus-circle')
                  const color =
                    t.type === 'income' ? 'text-[#22C55E] dark:text-success' : 'text-danger'
                  const prefix = t.type === 'income' ? '+ ' : '- '
                  return (
                    <Card
                      key={t.id}
                      role="listitem"
                      onClick={() => {
                        setDetailTx(t)
                        setShowDetail(true)
                      }}
                      className="border border-gray-100 dark:border-gray-700 shadow-subtle hover:shadow-elevation rounded-2xl bg-white dark:bg-card cursor-pointer transition-all"
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (cat?.color || '#999') + '20' }}
                        >
                          <Icon className="h-5 w-5" style={{ color: cat?.color || '#999' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cat?.name || 'Sem categoria'}
                            {t.type === 'expense' && cat && alertByCategory[cat.id] && (
                              <span
                                className={cn(
                                  'inline-block w-1.5 h-1.5 rounded-full ml-1 align-middle',
                                  alertByCategory[cat.id].exceeded ? 'bg-red-500' : 'bg-orange-500',
                                )}
                                title={
                                  alertByCategory[cat.id].exceeded
                                    ? `Orçamento estourado: ${Math.round(alertByCategory[cat.id].pct)}%`
                                    : `Orçamento em alerta: ${Math.round(alertByCategory[cat.id].pct)}%`
                                }
                                aria-label={
                                  alertByCategory[cat.id].exceeded
                                    ? `Orçamento estourado: ${Math.round(alertByCategory[cat.id].pct)}%`
                                    : `Orçamento em alerta: ${Math.round(alertByCategory[cat.id].pct)}%`
                                }
                              />
                            )}
                            {(() => {
                              const txTime = t.transaction_date.split('T')[1]?.split(' ')[0]
                              if (!txTime) return ''
                              // skip old default fixed time 12:00:00
                              if (txTime === '12:00:00') return ''
                              return ` · ${txTime.slice(0, 5)}`
                            })()}
                          </p>
                          {(t.is_shared ||
                            t.is_fixed ||
                            t.source === 'recurring' ||
                            t.source === 'investment' ||
                            t.recurring_id ||
                            t.is_installment) && (
                            <div className="flex gap-1 mt-1">
                              {t.is_shared && (
                                <Badge variant="outline" className="text-xs py-0 px-1 gap-0.5">
                                  <Share2 className="h-2.5 w-2.5" />
                                  Compartilhada
                                </Badge>
                              )}
                              {t.is_fixed && (
                                <Badge variant="outline" className="text-xs py-0 px-1 gap-0.5">
                                  <Calendar className="h-2.5 w-2.5" />
                                  Fixa
                                </Badge>
                              )}
                              {t.is_installment && (
                                <Badge
                                  variant="outline"
                                  className="text-xs py-0 px-1 gap-0.5 border-violet-200 text-violet-600 bg-violet-50"
                                  title="Parcelada"
                                >
                                  <Layers className="h-2.5 w-2.5" />
                                  Parcelada
                                </Badge>
                              )}
                              {(t.source === 'recurring' || t.recurring_id) && (
                                <Badge
                                  variant="outline"
                                  className="text-xs py-0 px-1 gap-0.5 border-sky-200 text-sky-600 bg-sky-50 cursor-pointer hover:bg-sky-100"
                                  title="Gerada automaticamente. Clique para editar a recorrência."
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate('/recorrentes')
                                  }}
                                >
                                  <Repeat className="h-2.5 w-2.5" />
                                  Recorrente
                                </Badge>
                              )}
                              {t.source === 'investment' && (
                                <Badge
                                  variant="outline"
                                  className="text-xs py-0 px-1 gap-0.5 border-emerald-200 text-emerald-700 bg-emerald-50"
                                  title="Parcela de investimento"
                                >
                                  <TrendingUp className="h-2.5 w-2.5" />
                                  Investimento
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {t.id.startsWith('pending-') && (
                          <Badge
                            className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 gap-1 shrink-0"
                            title="Pendente de sincronização"
                          >
                            <CloudOff className="h-3 w-3" />
                            <span className="hidden sm:inline">Pendente</span>
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {t.emotion && EMOTION_META[t.emotion] && (
                            <span
                              className="text-lg leading-none"
                              title={EMOTION_META[t.emotion].label}
                              aria-label={`Emoção: ${EMOTION_META[t.emotion].label}`}
                            >
                              {EMOTION_META[t.emotion].emoji}
                            </span>
                          )}
                          <span className={cn('font-bold text-sm whitespace-nowrap', color)}>
                            {prefix}
                            {formatBRL(t.amount)}
                          </span>
                        </div>
                        {canDeleteTransactions && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTx(t)
                              setShowDeleteDialog(true)
                            }}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-danger/5 shrink-0"
                            aria-label="Excluir transação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={openForm}
        aria-label="Adicionar transação"
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      <TransactionFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        ownerId={member?.id || ''}
        editingTransaction={editingTx}
        onSaved={refetch}
      />
      <TransactionDetailSheet
        transaction={detailTx}
        open={showDetail}
        onOpenChange={setShowDetail}
        isOwner={detailTx?.owner_id === member?.id}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <BankImportSheet
        open={showImport}
        onOpenChange={setShowImport}
        familyId={family.id}
        memberId={member?.id || ''}
        onImported={refetch}
      />

      {showRecurringForm && (
        <RecurringTransactionFormSheet
          open={showRecurringForm}
          onOpenChange={setShowRecurringForm}
          familyId={family.id}
          memberId={member?.id || ''}
          editing={editingRecurring}
          onSaved={() => {
            refetchRecurring()
            refetch()
          }}
        />
      )}

      <AlertDialog open={showRecurringEditDialog} onOpenChange={setShowRecurringEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5" />
              Editar transação recorrente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta transação foi gerada automaticamente pela recorrente "
              {recurringEditTx?.description}". Como deseja editar?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <RadioGroup
            value={recurringChoice}
            onValueChange={(v) => setRecurringChoice(v as 'once' | 'future')}
            defaultValue="once"
            className="gap-3"
          >
            <Label
              htmlFor="once"
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
            >
              <RadioGroupItem value="once" id="once" className="mt-0.5" />
              <span>
                <span className="font-medium">Aplicar apenas desta vez</span>
                <span className="block text-xs text-muted-foreground">
                  Edita só esta transação. A recorrente original não muda.
                </span>
              </span>
            </Label>
            <Label
              htmlFor="future"
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
            >
              <RadioGroupItem value="future" id="future" className="mt-0.5" />
              <span>
                <span className="font-medium">Aplicar a todas as futuras</span>
                <span className="block text-xs text-muted-foreground">
                  Edita a recorrente original. Próximas transações usam os novos valores.
                </span>
              </span>
            </Label>
          </RadioGroup>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecurringEditChoice}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleRowDelete}>Sim, excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
