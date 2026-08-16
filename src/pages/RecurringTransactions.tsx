import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat, Plus, Pencil, Trash2, Users, CreditCard, CalendarClock } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/EmptyState'
import { RecurringTransactionFormSheet } from '@/components/RecurringTransactionFormSheet'
import { useAuth } from '@/hooks/use-auth'
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions'
import {
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from '@/services/recurring-transactions'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { RecurringTransaction, RecurringFrequency } from '@/types/finance'

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  yearly: 'Anual',
}

function memberInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function RecurringTransactions() {
  const navigate = useNavigate()
  const { family, member } = useAuth()
  const { recurring, loading, error, refetch } = useRecurringTransactions(family?.id)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null)

  const totals = useMemo(() => {
    const active = recurring.filter((r) => r.active)
    const despesas = active.filter((r) => r.type === 'despesa').reduce((s, r) => s + r.amount, 0)
    const receitas = active.filter((r) => r.type === 'receita').reduce((s, r) => s + r.amount, 0)
    return { despesas, receitas, saldo: receitas - despesas }
  }, [recurring])

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = (r: RecurringTransaction) => {
    setEditing(r)
    setShowForm(true)
  }

  const toggleActive = async (r: RecurringTransaction) => {
    try {
      await updateRecurringTransaction(r.id, { active: !r.active })
      toast({ title: r.active ? 'Recorrente pausada' : 'Recorrente ativada' })
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar recorrente' })
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteRecurringTransaction(deleting.id)
      toast({ title: 'Recorrente excluída' })
      setDeleting(null)
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir recorrente' })
    }
  }

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
              Transações Recorrentes
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Contas fixas que se replicam automaticamente todo mês.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-[#166534] hover:bg-[#15803D]">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova recorrente</span>
        </Button>
      </div>

      {recurring.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Despesas/mês</span>
              <span className="text-lg font-extrabold text-red-600">
                {formatBRL(totals.despesas)}
              </span>
            </CardContent>
          </Card>
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Receitas/mês</span>
              <span className="text-lg font-extrabold text-[#22C55E]">
                {formatBRL(totals.receitas)}
              </span>
            </CardContent>
          </Card>
          <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white dark:bg-card">
            <CardContent className="p-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Saldo/mês</span>
              <span
                className={cn(
                  'text-lg font-extrabold',
                  totals.saldo >= 0 ? 'text-[#22C55E]' : 'text-red-600',
                )}
              >
                {formatBRL(totals.saldo)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
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
      ) : recurring.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <CardContent className="p-4">
            <EmptyState
              icon={<Repeat className="h-16 w-16" />}
              title="Nenhuma transação recorrente"
              description="Cadastre suas contas fixas (aluguel, streaming, salário, condomínio...) para gerar automaticamente todo mês."
              actionLabel="Cadastrar recorrente"
              onAction={openCreate}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" role="list">
          {recurring.map((r) => {
            const isReceita = r.type === 'receita'
            const amountColor = isReceita ? 'text-[#22C55E]' : 'text-red-600'
            const prefix = isReceita ? '+ ' : '- '
            const memberName = r.expand?.member_id?.display_name
            const categoryName = r.expand?.category_id?.name
            const cardName = r.expand?.card_id?.name
            return (
              <Card
                key={r.id}
                role="listitem"
                className={cn(
                  'border border-gray-100 dark:border-gray-700 shadow-subtle rounded-2xl bg-white dark:bg-card transition-all',
                  !r.active && 'opacity-60',
                )}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      isReceita ? 'bg-emerald-50' : 'bg-red-50',
                    )}
                  >
                    <Repeat className={cn('h-5 w-5', amountColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
                        {r.description}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] py-0 px-1.5',
                          r.active
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                            : 'border-gray-200 text-gray-500 bg-gray-50',
                        )}
                      >
                        {r.active ? 'Ativa' : 'Pausada'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {categoryName || 'Sem categoria'}
                      </span>
                      <span className="text-gray-300">·</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-0.5">
                        <CalendarClock className="h-2.5 w-2.5" />
                        {FREQ_LABEL[r.frequency]}
                        {r.frequency !== 'weekly' && ` dia ${r.day_of_month}`}
                      </Badge>
                      {r.shared && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 gap-0.5">
                          <Users className="h-2.5 w-2.5" />
                          Compartilhada
                        </Badge>
                      )}
                      {cardName && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1 gap-0.5">
                          <CreditCard className="h-2.5 w-2.5" />
                          {cardName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {memberName && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                        {memberInitials(memberName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className={cn('font-bold text-sm whitespace-nowrap shrink-0', amountColor)}>
                    {prefix}
                    {formatBRL(r.amount)}
                  </span>
                  <Switch
                    checked={r.active}
                    onCheckedChange={() => toggleActive(r)}
                    aria-label={r.active ? 'Pausar recorrente' : 'Ativar recorrente'}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(r)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 shrink-0"
                    aria-label="Editar recorrente"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(r)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-danger/5 shrink-0"
                    aria-label="Excluir recorrente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RecurringTransactionFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        memberId={member?.id || ''}
        editing={editing}
        onSaved={refetch}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleting?.description}"? As transações já geradas não
              serão afetadas, mas nenhuma nova será criada nos próximos meses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
