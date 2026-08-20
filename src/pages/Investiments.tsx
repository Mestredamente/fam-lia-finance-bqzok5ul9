import { useState, useMemo } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet, Filter, ArrowUpDown } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useInvestments } from '@/hooks/use-investments'
import { deleteInvestment } from '@/services/investments'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { InvestmentFormSheet } from '@/components/InvestmentFormSheet'
import { InvestmentDetailSheet } from '@/components/InvestmentDetailSheet'
import { EmptyState } from '@/components/EmptyState'
import { getInvestmentMeta } from '@/lib/patrimony-icons'
import { usePrivacy } from '@/hooks/use-privacy'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { InvestmentRecord } from '@/types/finance'

type StatusFilter = 'all' | 'active' | 'inactive'

export default function Investiments() {
  const { family, member } = useAuth()
  const { formatCurrency } = usePrivacy()
  const {
    investments,
    totalInvested,
    totalCurrent,
    totalReturn,
    returnPercentage,
    loading,
    error,
    refetch,
  } = useInvestments(family?.id)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingInv, setEditingInv] = useState<InvestmentRecord | null>(null)
  const [detailInv, setDetailInv] = useState<InvestmentRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Filter and sort by current_value desc (maior primeiro)
  const filteredInvestments = useMemo(() => {
    let list = [...investments]
    if (statusFilter === 'active') {
      list = list.filter((i) => i.is_active !== false)
    } else if (statusFilter === 'inactive') {
      list = list.filter((i) => i.is_active === false)
    }
    return list.sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
  }, [investments, statusFilter])

  const handleDelete = async () => {
    if (!detailInv) return
    try {
      await deleteInvestment(detailInv.id)
      toast({ title: 'Investimento excluído' })
      setShowDetail(false)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir investimento',
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">Investimentos</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Acompanhe seus investimentos e rentabilidade
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingInv(null)
            setShowForm(true)
          }}
          className="bg-[#166534] hover:bg-[#15803D] self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Novo investimento
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
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
          {/* Summary Banner */}
          <Card className="border-none shadow-subtle bg-[#F0FDF4] dark:bg-emerald-950/30 rounded-2xl">
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                  Total Investido
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-foreground">
                  {formatCurrency(totalInvested)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                  Valor Atual
                </span>
                <span className="text-lg font-bold text-[#166534] dark:text-emerald-400">
                  {formatCurrency(totalCurrent)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                  Rentabilidade
                </span>
                <span
                  className={cn(
                    'text-lg font-bold flex items-center gap-1.5',
                    totalReturn >= 0 ? 'text-[#22C55E] dark:text-emerald-400' : 'text-danger',
                  )}
                >
                  {totalReturn >= 0 ? (
                    <TrendingUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <TrendingDown className="h-4 w-4 shrink-0" />
                  )}
                  {formatCurrency(totalReturn)}{' '}
                  <span className="text-xs font-semibold">({returnPercentage.toFixed(1)}%)</span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={cn(statusFilter === 'all' && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setStatusFilter('all')}
            >
              Todos ({investments.length})
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              className={cn(statusFilter === 'active' && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setStatusFilter('active')}
            >
              Ativos ({investments.filter((i) => i.is_active !== false).length})
            </Button>
            <Button
              variant={statusFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              className={cn(statusFilter === 'inactive' && 'bg-[#166534] hover:bg-[#15803D]')}
              onClick={() => setStatusFilter('inactive')}
            >
              Inativos ({investments.filter((i) => i.is_active === false).length})
            </Button>
          </div>

          {/* Cards Grid or Empty State */}
          {filteredInvestments.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-8 w-8 text-[#166534]" />}
              title="Nenhum investimento cadastrado"
              description={
                statusFilter !== 'all'
                  ? 'Nenhum investimento encontrado com o filtro selecionado.'
                  : 'Cadastre suas ações, fundos, renda fixa ou criptoativos para acompanhar seu patrimônio.'
              }
              actionLabel="Novo investimento"
              onAction={() => {
                setEditingInv(null)
                setShowForm(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvestments.map((inv) => {
                const meta = getInvestmentMeta(inv.type)
                const Icon = meta.icon
                const ret = inv.current_value - inv.amount_invested
                const retPct = inv.amount_invested > 0 ? (ret / inv.amount_invested) * 100 : 0
                const isActive = inv.is_active !== false

                return (
                  <Card
                    key={inv.id}
                    onClick={() => {
                      setDetailInv(inv)
                      setShowDetail(true)
                    }}
                    className="border border-gray-100 dark:border-gray-800 shadow-subtle hover:shadow-elevation rounded-2xl bg-white dark:bg-card cursor-pointer transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
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
                              {inv.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {inv.institution || meta.label}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-2 py-0.5',
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
                            )}
                          >
                            {isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50 dark:border-gray-800 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block text-[11px]">
                            Investido
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(inv.amount_invested)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400 block text-[11px]">
                            Valor Atual
                          </span>
                          <span className="font-bold text-gray-900 dark:text-foreground">
                            {formatCurrency(inv.current_value)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                          Rentabilidade:
                        </span>
                        <span
                          className={cn(
                            'font-bold',
                            ret >= 0
                              ? 'text-[#22C55E] dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {ret >= 0 ? '+' : ''}
                          {formatCurrency(ret)} ({retPct.toFixed(1)}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50 dark:border-gray-800">
                        <span>{meta.label}</span>
                        {inv.expand?.owner_id?.display_name && (
                          <span>{inv.expand.owner_id.display_name}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Form & Detail Sheets */}
      <InvestmentFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        ownerId={member?.id || ''}
        editingInvestment={editingInv}
        onSaved={refetch}
      />
      <InvestmentDetailSheet
        investment={detailInv}
        open={showDetail}
        onOpenChange={setShowDetail}
        isOwner={detailInv?.owner_id === member?.id}
        onEdit={() => {
          setEditingInv(detailInv)
          setShowDetail(false)
          setShowForm(true)
        }}
        onDelete={handleDelete}
      />
    </div>
  )
}
