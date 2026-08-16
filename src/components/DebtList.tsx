import { useState } from 'react'
import { Plus, AlertCircle, FileText, Calculator } from 'lucide-react'
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
import { getDebtMeta } from '@/lib/patrimony-icons'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { DebtRecord, MemberRecord } from '@/types/finance'

interface Props {
  familyId: string
  members: MemberRecord[]
}

export function DebtList({ familyId, members }: Props) {
  const { member } = useAuth()
  const perms = usePermissions()
  const canManageDebts = perms.canManageDebts()
  const { debts, totalRemaining, totalInstallments, incomeCommitment, loading, error, refetch } =
    useDebts(familyId)
  const [memberFilter, setMemberFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null)
  const [detailDebt, setDetailDebt] = useState<DebtRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showPayoffCalc, setShowPayoffCalc] = useState(false)

  const filtered = memberFilter === 'all' ? debts : debts.filter((d) => d.owner_id === memberFilter)
  const commitmentHigh = incomeCommitment !== null && incomeCommitment >= 30

  const handleDelete = async () => {
    if (!detailDebt) return
    try {
      await deleteDebt(detailDebt.id)
      toast({ title: 'Dívida excluída' })
      setShowDetail(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir dívida' })
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
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao registrar pagamento' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">Dívidas</h2>
        <div className="flex gap-2">
          {debts.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowPayoffCalc(true)}>
              <Calculator className="h-4 w-4 mr-1" /> Simular quitação
            </Button>
          )}
          {canManageDebts && (
            <Button
              size="sm"
              onClick={() => {
                setEditingDebt(null)
                setShowForm(true)
              }}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
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
          <Card className="border-none shadow-subtle bg-[#FEF2F2] dark:bg-red-950/20 rounded-2xl">
            <CardContent className="p-5 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Total em dívidas
                  </span>
                  <span className="text-base font-bold text-danger">
                    {formatBRL(totalRemaining)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Parcelas restantes
                  </span>
                  <span className="text-base font-bold text-gray-900 dark:text-foreground">
                    {totalInstallments}
                  </span>
                </div>
              </div>
              {incomeCommitment !== null ? (
                <div
                  className={cn(
                    'flex items-center gap-2 text-xs font-medium',
                    commitmentHigh ? 'text-danger' : 'text-gray-600 dark:text-gray-300',
                  )}
                >
                  {commitmentHigh && <AlertCircle className="h-3.5 w-3.5" />}
                  Comprometimento de renda: {incomeCommitment.toFixed(1)}%
                  {commitmentHigh && ' — Renda comprometida!'}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Renda não informada</p>
              )}
            </CardContent>
          </Card>

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

          {filtered.length === 0 ? (
            <Card className="border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <FileText className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nenhuma dívida cadastrada
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingDebt(null)
                    setShowForm(true)
                  }}
                  className="bg-[#166534] hover:bg-[#15803D]"
                >
                  Adicionar primeira dívida
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((debt) => {
                const meta = getDebtMeta(debt.type)
                const Icon = meta.icon
                const progress = (debt.installments_paid / debt.installments_total) * 100
                return (
                  <Card
                    key={debt.id}
                    onClick={() => {
                      setDetailDebt(debt)
                      setShowDetail(true)
                    }}
                    className="border border-gray-100 dark:border-gray-700 shadow-subtle hover:shadow-elevation rounded-2xl bg-white dark:bg-card cursor-pointer transition-all"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color + '20' }}
                        >
                          <Icon className="h-5 w-5" style={{ color: meta.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-foreground truncate">
                            {debt.description}
                          </p>
                        </div>
                        <Badge style={{ backgroundColor: meta.color + '20', color: meta.color }}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-danger">
                          {formatBRL(debt.remaining_amount)} restantes
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatBRL(debt.installment_value)}/mês
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                          <span>
                            {debt.installments_paid} de {debt.installments_total} parcelas
                          </span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#22C55E] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Juros: {debt.interest_rate}% a.m.
                        {debt.expand?.owner_id ? ` • ${debt.expand.owner_id.display_name}` : ''}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {canManageDebts && (
        <button
          onClick={() => {
            setEditingDebt(null)
            setShowForm(true)
          }}
          className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <DebtFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={familyId}
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
        familyId={familyId}
      />
    </div>
  )
}
