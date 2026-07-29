import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useInvestments } from '@/hooks/use-investments'
import { deleteInvestment } from '@/services/investments'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { InvestmentFormSheet } from '@/components/InvestmentFormSheet'
import { InvestmentDetailSheet } from '@/components/InvestmentDetailSheet'
import { getInvestmentMeta } from '@/lib/patrimony-icons'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { InvestmentRecord, MemberRecord } from '@/types/finance'

interface Props {
  familyId: string
  members: MemberRecord[]
}

export function InvestmentList({ familyId, members }: Props) {
  const { member } = useAuth()
  const {
    investments,
    totalInvested,
    totalCurrent,
    totalReturn,
    returnPercentage,
    loading,
    error,
    refetch,
  } = useInvestments(familyId)
  const [memberFilter, setMemberFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingInv, setEditingInv] = useState<InvestmentRecord | null>(null)
  const [detailInv, setDetailInv] = useState<InvestmentRecord | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const filtered =
    memberFilter === 'all' ? investments : investments.filter((i) => i.owner_id === memberFilter)

  const handleDelete = async () => {
    if (!detailInv) return
    try {
      await deleteInvestment(detailInv.id)
      toast({ title: 'Investimento excluído' })
      setShowDetail(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir investimento' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Investimentos</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingInv(null)
            setShowForm(true)
          }}
          className="bg-[#166534] hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-none shadow-subtle bg-[#F0FDF4] rounded-2xl">
            <CardContent className="p-5 grid grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-gray-500 block">Investido</span>
                <span className="text-base font-bold text-gray-900">
                  {formatBRL(totalInvested)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Atual</span>
                <span className="text-base font-bold text-[#166534]">
                  {formatBRL(totalCurrent)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Retorno</span>
                <span
                  className={cn(
                    'text-base font-bold',
                    totalReturn >= 0 ? 'text-[#22C55E]' : 'text-red-600',
                  )}
                >
                  {formatBRL(totalReturn)}{' '}
                  <span className="text-xs">({returnPercentage.toFixed(1)}%)</span>
                </span>
              </div>
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
            <Card className="border-dashed border-gray-200 rounded-2xl">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-gray-500">Nenhum investimento cadastrado</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingInv(null)
                    setShowForm(true)
                  }}
                  className="bg-[#166534] hover:bg-[#15803D]"
                >
                  Adicionar primeiro investimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((inv) => {
                const meta = getInvestmentMeta(inv.type)
                const Icon = meta.icon
                const ret = inv.current_value - inv.amount_invested
                const retPct = inv.amount_invested > 0 ? (ret / inv.amount_invested) * 100 : 0
                return (
                  <Card
                    key={inv.id}
                    onClick={() => {
                      setDetailInv(inv)
                      setShowDetail(true)
                    }}
                    className="border border-gray-100 shadow-subtle hover:shadow-elevation rounded-2xl bg-white cursor-pointer transition-all"
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
                          <p className="font-bold text-sm text-gray-900 truncate">{inv.name}</p>
                          <p className="text-xs text-gray-500 truncate">{inv.institution}</p>
                        </div>
                        <Badge style={{ backgroundColor: meta.color + '20', color: meta.color }}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">
                          Investido:{' '}
                          <span className="font-medium text-gray-700">
                            {formatBRL(inv.amount_invested)}
                          </span>
                        </span>
                        <span className="text-gray-500">
                          Atual:{' '}
                          <span className="font-bold text-gray-900">
                            {formatBRL(inv.current_value)}
                          </span>
                        </span>
                      </div>
                      <div
                        className={cn(
                          'text-xs font-bold',
                          ret >= 0 ? 'text-[#22C55E]' : 'text-red-600',
                        )}
                      >
                        {ret >= 0 ? '+' : ''}
                        {formatBRL(ret)} ({retPct.toFixed(1)}%)
                      </div>
                      {inv.maturity_date && (
                        <p className="text-[10px] text-gray-400">
                          Vence em {new Date(inv.maturity_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {inv.expand?.owner_id && (
                        <p className="text-[10px] text-gray-400">
                          {inv.expand.owner_id.display_name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => {
          setEditingInv(null)
          setShowForm(true)
        }}
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      <InvestmentFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={familyId}
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
