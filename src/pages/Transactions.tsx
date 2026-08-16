import { useState, useEffect } from 'react'
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
  Eraser,
  Loader2,
} from 'lucide-react'
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
import { getActiveMembersByFamilyId } from '@/services/members'
import { deleteTransaction, cleanupOrphanTransactions } from '@/services/transactions'
import { deleteFutureInstallments } from '@/services/future-installments'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import { ExportButton } from '@/components/ExportButton'
import { BankImportSheet } from '@/components/BankImportSheet'
import { generateMonthlyPDF } from '@/lib/pdf-report'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { TransactionRecord, MemberRecord, TransactionEmotion } from '@/types/finance'

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
  const { family, member } = useAuth()
  const perms = usePermissions()
  const canDeleteTransactions = perms.canDeleteTransactions()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [memberFilter, setMemberFilter] = useState('all')
  const [emotionFilter, setEmotionFilter] = useState<TransactionEmotion | 'all'>('all')
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [detailTx, setDetailTx] = useState<TransactionRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [deleteTx, setDeleteTx] = useState<TransactionRecord | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const { transactions, setTransactions, loading, error, refetch } = useTransactions(
    family?.id,
    year,
    month,
  )

  useEffect(() => {
    if (family)
      getActiveMembersByFamilyId(family.id)
        .then(setMembers)
        .catch(() => {})
  }, [family?.id])

  const filtered = transactions.filter((t) => {
    if (memberFilter !== 'all' && t.owner_id !== memberFilter) return false
    if (emotionFilter !== 'all' && t.emotion !== emotionFilter) return false
    return true
  })
  const grouped = groupByDay(filtered)

  const handleDelete = async (deleteAll?: boolean) => {
    if (!detailTx) return
    const prev = transactions
    const idsToRemove = new Set([detailTx.id])
    if (deleteAll && detailTx.parent_transaction_id) {
      prev.forEach((t) => {
        if (t.parent_transaction_id === detailTx.parent_transaction_id) idsToRemove.add(t.id)
      })
    }
    setTransactions(prev.filter((t) => !idsToRemove.has(t.id)))
    setShowDetail(false)
    try {
      await deleteTransaction(detailTx.id)
      if (deleteAll && detailTx.parent_transaction_id) {
        await deleteFutureInstallments(detailTx.parent_transaction_id)
      }
      toast({ title: 'Transação excluída' })
    } catch {
      setTransactions(prev)
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir transação' })
    }
  }

  const handleRowDelete = async () => {
    if (!deleteTx) return
    const prev = transactions
    setTransactions(prev.filter((t) => t.id !== deleteTx.id))
    setShowDeleteDialog(false)
    try {
      await deleteTransaction(deleteTx.id)
      toast({ title: 'Transação excluída' })
    } catch {
      setTransactions(prev)
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir transação' })
    }
  }

  const handleCleanupOrphans = async () => {
    setCleaningUp(true)
    try {
      const result = await cleanupOrphanTransactions()
      toast({
        title: `${result.deleted} transações órfãs removidas`,
        description: `Antes: ${result.before_null_category} sem categoria, ${result.before_filled_category} com categoria. Depois: ${result.remaining_null_category} sem categoria.`,
      })
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao limpar transações' })
    } finally {
      setCleaningUp(false)
    }
  }

  const openForm = () => {
    setEditingTx(null)
    setShowForm(true)
  }
  const openEdit = () => {
    setEditingTx(detailTx)
    setShowDetail(false)
    setShowForm(true)
  }

  if (!family)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando...</p>
      </div>
    )

  return (
    <div className="space-y-6 animate-fade-in">
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
          <ExportButton transactions={filtered} month={month} year={year} />
          <Button
            variant="secondary"
            onClick={() => generateMonthlyPDF(filtered, month, year)}
            className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Relatório</span>
          </Button>
          <Button
            variant="secondary"
            onClick={handleCleanupOrphans}
            disabled={cleaningUp}
            className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
          >
            {cleaningUp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eraser className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Limpar órfãs</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="h-9 w-9 p-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] text-center">
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          <Button
            variant={memberFilter === 'all' ? 'default' : 'secondary'}
            onClick={() => setMemberFilter('all')}
            className={cn(
              'h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground',
              memberFilter === 'all' && 'bg-[#166534] hover:bg-[#15803D] text-white',
            )}
          >
            Todos
          </Button>
          {members.map((m) => (
            <Button
              key={m.id}
              variant={memberFilter === m.id ? 'default' : 'secondary'}
              onClick={() => setMemberFilter(m.id)}
              className={cn(
                'h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground',
                memberFilter === m.id && 'bg-[#166534] hover:bg-[#15803D] text-white',
              )}
            >
              {m.display_name}
            </Button>
          ))}
        </div>
        <Select
          value={emotionFilter}
          onValueChange={(v) => setEmotionFilter(v as TransactionEmotion | 'all')}
        >
          <SelectTrigger className="w-[150px] h-9 rounded-lg px-3 py-1.5 text-sm shrink-0 bg-muted border-0 hover:bg-muted/80">
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
                    t.type === 'income'
                      ? 'text-[#22C55E] dark:text-success'
                      : t.type === 'investment'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-danger'
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
                            {(() => {
                              const txTime = t.transaction_date.split('T')[1]?.split(' ')[0]
                              if (!txTime) return ''
                              // skip old default fixed time 12:00:00
                              if (txTime === '12:00:00') return ''
                              return ` · ${txTime.slice(0, 5)}`
                            })()}
                          </p>
                          {(t.is_shared || t.is_fixed) && (
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
                            </div>
                          )}
                        </div>
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
