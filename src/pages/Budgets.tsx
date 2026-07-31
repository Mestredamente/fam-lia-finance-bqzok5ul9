import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useBudgets } from '@/hooks/use-budgets'
import { useRealtime } from '@/hooks/use-realtime'
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
import { BudgetFormSheet } from '@/components/BudgetFormSheet'
import { getActiveMembersByFamilyId } from '@/services/members'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import { deleteBudget } from '@/services/budgets'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { TransactionRecord, MemberRecord } from '@/types/finance'
import type { BudgetRecord } from '@/types/budgets'

export default function Budgets() {
  const { family } = useAuth()
  const { budgets, loading, refetch } = useBudgets(family?.id)
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetRecord | null>(null)
  const [deleting, setDeleting] = useState<BudgetRecord | null>(null)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  useEffect(() => {
    if (!family) return
    getActiveMembersByFamilyId(family.id)
      .then(setMembers)
      .catch(() => {})
    getTransactionsByFamilyAndMonth(family.id, year, month)
      .then(setTransactions)
      .catch(() => {})
  }, [family?.id])

  useRealtime('transactions', () => {
    if (family)
      getTransactionsByFamilyAndMonth(family.id, year, month)
        .then(setTransactions)
        .catch(() => {})
  })

  const progress = useMemo(() => {
    return budgets.map((b) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === b.category_id &&
            (!b.member_id || t.owner_id === b.member_id),
        )
        .reduce((s, t) => s + t.amount, 0)
      const pct = b.monthly_limit > 0 ? Math.min((spent / b.monthly_limit) * 100, 100) : 0
      return { budget: b, spent, pct }
    })
  }, [budgets, transactions])

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteBudget(deleting.id)
      toast({ title: 'Orçamento excluído' })
      setDeleting(null)
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir' })
    }
  }

  if (!family) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Orçamentos</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="bg-[#166534] hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Novo
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : progress.length === 0 ? (
        <Card className="border border-gray-100 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-[#166534]" />
            </div>
            <p className="text-sm text-gray-500">
              Nenhum orçamento criado. Defina limites de gastos por categoria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {progress.map(({ budget, spent, pct }) => {
            const cat = budget.expand?.category_id
            const Icon = getCategoryIcon(cat?.icon || 'wallet')
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'
            return (
              <Card key={budget.id} className="border border-gray-100 shadow-subtle rounded-2xl">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: (cat?.color || '#999') + '20' }}
                      >
                        <Icon className="h-5 w-5" style={{ color: cat?.color || '#999' }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">
                          {cat?.name || 'Sem categoria'}
                        </h3>
                        {budget.expand?.member_id && (
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            {budget.expand.member_id.display_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(budget)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleting(budget)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{formatBRL(spent)} gastos</span>
                    <span className="font-medium text-gray-700">
                      Limite: {formatBRL(budget.monthly_limit)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <BudgetFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        familyId={family.id}
        editingBudget={editing}
        members={members}
        onSaved={refetch}
      />
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
