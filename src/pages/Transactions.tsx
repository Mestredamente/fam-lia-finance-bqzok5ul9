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
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useTransactions } from '@/hooks/use-transactions'
import { getActiveMembersByFamilyId } from '@/services/members'
import { deleteTransaction } from '@/services/transactions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { TransactionDetailSheet } from '@/components/TransactionDetailSheet'
import { ExportButton } from '@/components/ExportButton'
import { BankImportSheet } from '@/components/BankImportSheet'
import { generateMonthlyPDF } from '@/lib/pdf-report'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { TransactionRecord, MemberRecord } from '@/types/finance'

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
  const [currentDate, setCurrentDate] = useState(new Date())
  const [memberFilter, setMemberFilter] = useState('all')
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [detailTx, setDetailTx] = useState<TransactionRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)

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

  const filtered =
    memberFilter === 'all' ? transactions : transactions.filter((t) => t.owner_id === memberFilter)
  const grouped = groupByDay(filtered)

  const handleDelete = async () => {
    if (!detailTx) return
    const prev = transactions
    setTransactions(prev.filter((t) => t.id !== detailTx.id))
    setShowDetail(false)
    try {
      await deleteTransaction(detailTx.id)
      toast({ title: 'Transação excluída' })
    } catch {
      setTransactions(prev)
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir transação' })
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
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Transações</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Importar</span>
          </Button>
          <ExportButton transactions={filtered} month={month} year={year} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMonthlyPDF(filtered, month, year)}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Relatório</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={memberFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className={cn(memberFilter === 'all' && 'bg-[#166534] hover:bg-[#15803D]')}
          onClick={() => setMemberFilter('all')}
        >
          Todos
        </Button>
        {members.map((m) => (
          <Button
            key={m.id}
            variant={memberFilter === m.id ? 'default' : 'outline'}
            size="sm"
            className={cn(memberFilter === m.id && 'bg-[#166534] hover:bg-[#15803D]')}
            onClick={() => setMemberFilter(m.id)}
          >
            {m.display_name}
          </Button>
        ))}
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
            <p className="text-sm text-red-600">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <Receipt className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma transação neste mês</p>
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
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {d.getDate()} de {MONTHS[d.getMonth()]}
                </h2>
                {items.map((t) => {
                  const cat = t.expand?.category_id
                  const Icon = getCategoryIcon(cat?.icon || 'plus-circle')
                  const color =
                    t.type === 'income'
                      ? 'text-[#22C55E]'
                      : t.type === 'investment'
                        ? 'text-blue-600'
                        : 'text-red-600'
                  const prefix = t.type === 'income' ? '+ ' : '- '
                  return (
                    <Card
                      key={t.id}
                      role="listitem"
                      onClick={() => {
                        setDetailTx(t)
                        setShowDetail(true)
                      }}
                      className="border border-gray-100 shadow-subtle hover:shadow-elevation rounded-2xl bg-white cursor-pointer transition-all"
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (cat?.color || '#999') + '20' }}
                        >
                          <Icon className="h-5 w-5" style={{ color: cat?.color || '#999' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-500">{cat?.name || 'Sem categoria'}</p>
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
                        <span className={cn('font-bold text-sm whitespace-nowrap', color)}>
                          {prefix}
                          {formatBRL(t.amount)}
                        </span>
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
    </div>
  )
}
