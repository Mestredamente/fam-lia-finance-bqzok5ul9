import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tv } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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

export function SubscriptionsCard({ familyId }: Props) {
  const navigate = useNavigate()
  const { groups: subscriptions, loading: subsLoading } = useSubscriptions(familyId)
  const totalMonthly = subscriptions.reduce((s, g) => s + g.monthly, 0)

  return (
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
  )
}
