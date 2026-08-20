import { useState, useMemo } from 'react'
import { Plus, FileText, AlertCircle, Calculator, CheckCircle2, DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useDebts } from '@/hooks/use-debts'
import { deleteDebt, registerDebtPayment } from '@/services/debts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DebtFormSheet } from '@/components/DebtFormSheet'
import { DebtDetailSheet } from '@/components/DebtDetailSheet'
import { DebtPayoffCalculator } from '@/components/DebtPayoffCalculator'
import { EmptyState } from '@/components/EmptyState'
import { getDebtMeta } from '@/lib/patrimony-icons'
import { usePrivacy } from '@/hooks/use-privacy'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { DebtRecord } from '@/types/finance'

type DebtStatusFilter = 'all' | 'active' | 'paid'

export default function Dividas() {
  const { family, member } = useAuth()
  const perms = usePermissions()
  const canManageDebts = perms.canManageDebts()
  const { formatCurrency } = usePrivacy()

  const { debts, totalRemaining, totalInstallments, incomeCommitment, loading, error, refetch } =
    useDebts(family?.id)

  const [statusFilter, setStatusFilter] = useState<DebtStatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null)
  const [detailDebt, setDetailDebt] = useState<DebtRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showPayoffCalc, setShowPayoffCalc] = useState(false)

  const commitmentHigh = incomeCommitment !== null && incomeCommitment >= 30

  // Filter debts: all / active (remaining > 0 and is_active !== false) / paid (remaining == 0 or is_active === false)
  const filteredDebts = useMemo(() => {
    let list = [...debts]
    if (statusFilter === 'active') {
      list = list.filter((d) => (d.remaining_amount || 0) > 0 && d.is_active !== false)
    } else if (statusFilter === 'paid') {
      list = list.filter((d) => (d.remaining_amount || 0) <= 0 || d.is_active === false)
    }
    return list.sort((a, b) => (b.remaining_amount || 0) - (a.remaining_amount || 0))
  }, [debts, statusFilter])

  const handleDelete = async () => {
    if (!detailDebt) return
    try {
      await deleteDebt(detailDebt.id)
      toast({ title: 'Dívida excluída' })
      setShowDetail(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir dívida',
      })
    }
  }

  const handleRegisterPayment = async () => {
    if (!detailDebt) return
    try {
      const result = await registerDebtPayment(detailDebt)
      if (result.quitada) {
        toast({ title: 'Dívida quitada! 🎉' })
      } else {
        toast({ title: 'Pagamento registrado' })
      }
      setShowDetail(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao registrar pagamento',
      })
    }
  }

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando família...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">Dívidas</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Gerencie suas dívidas e financiamentos
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {debts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPayoffCalc(true)}
              className="gap-1.5"
            >
              <Calculator className="h-4 w-4" /> Simular quitação
            </Button>
          )}
          {canManageDebts && (
            <Button
              onClick={() => {
                setEditingDebt(null)
                setShowForm(true)
              }}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nova dívida
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-900/50 rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-danger mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Card */}
          <Card className="border-none shadow-subtle bg-[#FEF2F2] dark:bg-red-950/20 rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                    Total em Dívidas
                  </span>
                  <span className="text-lg font-bold text-danger">
                    {formatCurrency(totalRemaining)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                    Parcelas Restantes
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-foreground">
                    {totalInstallments}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                    Comprometimento de Renda
                  </span>
                  <div
                    className={cn(
                      'text-lg font-bold flex items-center gap-1.5',
                      commitmentHigh ? 'text-danger' : 'text-gray-800 dark:text-gray-100',
                    )}
                  >
                    {incomeCommitment !== null ? `${incomeCommitment.toFixed(1)}%` : '—'}
                    {commitmentHigh && <AlertCircle className="h-4 w-4 text-danger shrink-0" />}
                  </div>
                </div>
              </div>

              {commitmentHigh && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-100/60 dark:bg-red-950/40 text-danger text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Atenção: mais de 30% da renda da família está comprometida com dívidas.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={cn(statusFilter === 'all' && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setStatusFilter('all')}
            >
              Todas ({debts.length})
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              className={cn(statusFilter === 'active' && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setStatusFilter('active')}
            >
              Ativas (
              {debts.filter((d) => (d.remaining_amount || 0) > 0 && d.is_active !== false).length})
            </Button>
            <Button
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              className={cn(statusFilter === 'paid' && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setStatusFilter('paid')}
            >
              Quitadas (
              {debts.filter((d) => (d.remaining_amount || 0) <= 0 || d.is_active === false).length})
            </Button>
          </div>

          {/* List / Grid or Empty State */}
          {filteredDebts.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8 text-[#166534]" />}
              title="Nenhuma dívida cadastrada"
              description={
                statusFilter !== 'all'
                  ? 'Nenhuma dívida encontrada com o filtro selecionado.'
                  : 'Cadastre financiamentos, empréstimos ou crediários para organizar suas parcelas.'
              }
              actionLabel={canManageDebts ? 'Nova dívida' : undefined}
              onAction={
                canManageDebts
                  ? () => {
                      setEditingDebt(null)
                      setShowForm(true)
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDebts.map((debt) => {
                const meta = getDebtMeta(debt.type)
                const Icon = meta.icon
                const totalInstallmentsCount = debt.installments_total || 1
                const paidInstallments = debt.installments_paid || 0
                const progress = Math.min(
                  Math.round((paidInstallments / totalInstallmentsCount) * 100),
                  100,
                )
                const isPaid = (debt.remaining_amount || 0) <= 0 || debt.is_active === false
                const amortizationSystem =
                  debt.amortization_system || (debt.type === 'financing' ? 'PRICE' : 'Livre')

                return (
                  <Card
                    key={debt.id}
                    onClick={() => {
                      setDetailDebt(debt)
                      setShowDetail(true)
                    }}
                    className="border border-gray-100 dark:border-gray-800 shadow-subtle hover:shadow-elevation rounded-2xl bg-white dark:bg-card cursor-pointer transition-all hover:border-emerald-300 dark:hover:border-emerald-700 flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: meta.color + '20' }}
                          >
                            <Icon className="h-5 w-5" style={{ color: meta.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
                              {debt.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {meta.label}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800"
                          >
                            {amortizationSystem}
                          </Badge>
                          {isPaid ? (
                            <Badge className="bg-emerald-100 text-[#166534] border-0 text-[10px]">
                              Quitada
                            </Badge>
                          ) : (
                            <Badge
                              style={{ backgroundColor: meta.color + '20', color: meta.color }}
                            >
                              {meta.label}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50 dark:border-gray-800 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block text-[11px]">
                            Valor Restante
                          </span>
                          <span className="font-bold text-danger text-sm">
                            {formatCurrency(debt.remaining_amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block text-[11px]">
                            Valor da Parcela
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-foreground">
                            {formatCurrency(debt.installment_value)}/mês
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          <span>
                            {paidInstallments} de {totalInstallmentsCount} parcelas
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#22C55E] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-800">
                        <span>Juros: {debt.interest_rate || 0}% a.m.</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDetailDebt(debt)
                            setShowDetail(true)
                          }}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Sheets & Dialogs */}
      <DebtFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        ownerId={member?.id || ''}
        editingDebt={editingDebt}
        onSaved={refetch}
      />
      <DebtDetailSheet
        debt={detailDebt}
        open={showDetail}
        onOpenChange={setShowDetail}
        isOwner={detailDebt?.owner_id === member?.id}
        onEdit={() => {
          setEditingDebt(detailDebt)
          setShowDetail(false)
          setShowForm(true)
        }}
        onDelete={handleDelete}
        onRegisterPayment={handleRegisterPayment}
      />
      <DebtPayoffCalculator
        open={showPayoffCalc}
        onOpenChange={setShowPayoffCalc}
        debts={debts}
        familyId={family.id}
      />
    </div>
  )
}
