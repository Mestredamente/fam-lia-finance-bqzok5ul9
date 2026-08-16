import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Landmark, Tv, Sparkles, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useFixedBills } from '@/hooks/use-fixed-bills'
import { usePatrimony } from '@/hooks/use-patrimony'
import { useAIInsights } from '@/hooks/use-ai-insights'
import { useRealtime } from '@/hooks/use-realtime'
import { getSubscriptionsByFamilyId } from '@/services/subscriptions'
import { formatBRL } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface SubscriptionGroup {
  name: string
  monthly: number
}

interface Props {
  familyId: string
  memberId: string
  year: number
  month: number
  onAddFixed: () => void
}

function useSubscriptions(familyId: string) {
  const [groups, setGroups] = useState<SubscriptionGroup[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const txs: TransactionRecord[] = await getSubscriptionsByFamilyId(familyId, 7)
      const grouped: Record<string, TransactionRecord[]> = {}
      for (const t of txs) {
        if (!grouped[t.description]) grouped[t.description] = []
        grouped[t.description].push(t)
      }
      const result = Object.entries(grouped)
        .filter(([, txs]) => txs.length >= 2)
        .map(([name, txs]) => ({ name, monthly: txs[0].amount }))
      setGroups(result)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId])
  useRealtime('transactions', () => loadData())

  return { groups, loading }
}

export function DashboardCards({ familyId, memberId, year, month, onAddFixed }: Props) {
  const navigate = useNavigate()
  const { fixedBills, totalPaid, loading: billsLoading } = useFixedBills(familyId, year, month)
  const { netWorth, loading: patrimonyLoading } = usePatrimony(familyId)
  const { groups: subscriptions, loading: subsLoading } = useSubscriptions(familyId)
  const { insights, loading: insightsLoading } = useAIInsights(familyId, memberId)

  const totalBills = fixedBills.length
  const paidPct = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0

  const totalMonthly = subscriptions.reduce((s, g) => s + g.monthly, 0)

  const insightText = insights[0]?.titulo || insights[0]?.descricao || null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full">
      {/* Contas Fixas */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate('/casa')}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/casa')}
        className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
      >
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Contas Fixas</h3>
          </div>
          {billsLoading ? (
            <Skeleton className="h-6 w-full" />
          ) : totalBills === 0 ? (
            <div className="flex flex-col gap-2 mt-auto">
              <p className="text-xs text-gray-500">Nenhuma conta fixa cadastrada</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddFixed()
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-auto">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{totalPaid}</span> de{' '}
                <span className="font-bold text-gray-900">{totalBills}</span> contas pagas
              </p>
              <Progress value={paidPct} className="h-2" />
              <p className="text-xs text-gray-400">{paidPct}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patrimônio */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate('/patrimonio')}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/patrimonio')}
        className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
      >
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Patrimônio</h3>
          </div>
          {patrimonyLoading ? (
            <Skeleton className="h-6 w-full mt-auto" />
          ) : (
            <div className="flex flex-col gap-1 mt-auto">
              <p className="text-xs text-gray-500">Patrimônio líquido</p>
              <p className="text-lg font-bold text-gray-900">{formatBRL(netWorth)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assinaturas */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate('/transacoes')}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/transacoes')}
        className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
      >
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Tv className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Assinaturas</h3>
          </div>
          {subsLoading ? (
            <Skeleton className="h-6 w-full mt-auto" />
          ) : subscriptions.length === 0 ? (
            <p className="text-xs text-gray-500 mt-auto">Nenhuma assinatura detectada</p>
          ) : (
            <div className="flex flex-col gap-1 mt-auto">
              <p className="text-lg font-bold text-gray-900">{formatBRL(totalMonthly)}</p>
              <p className="text-xs text-gray-500">
                {subscriptions.length}{' '}
                {subscriptions.length === 1 ? 'assinatura ativa' : 'assinaturas ativas'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights IA */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => navigate('/consultora')}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/consultora')}
        className="cursor-pointer hover:shadow-md transition-shadow rounded-2xl border border-gray-100 bg-white min-h-[160px]"
      >
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Insights</h3>
          </div>
          {insightsLoading ? (
            <Skeleton className="h-6 w-full mt-auto" />
          ) : insightText ? (
            <p className="text-xs text-gray-600 mt-auto line-clamp-3">{insightText}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-auto">Analisando seus padrões...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
