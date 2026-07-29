import { useEffect, useState } from 'react'
import { Tv } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtime } from '@/hooks/use-realtime'
import { getSubscriptionsByFamilyId } from '@/services/subscriptions'
import { formatBRL } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface SubscriptionGroup {
  name: string
  monthly: number
  annual: number
  firstDate: string
  isLongTerm: boolean
}

interface Props {
  familyId: string
  onSeeDetails: () => void
}

export function SubscriptionAlert({ familyId, onSeeDetails }: Props) {
  const [groups, setGroups] = useState<SubscriptionGroup[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const txs = await getSubscriptionsByFamilyId(familyId, 7)
      const grouped: Record<string, TransactionRecord[]> = {}
      for (const t of txs) {
        if (!grouped[t.description]) grouped[t.description] = []
        grouped[t.description].push(t)
      }
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const result = Object.entries(grouped)
        .filter(([, txs]) => txs.length >= 2)
        .map(([name, txs]) => {
          const sorted = [...txs].sort((a, b) =>
            a.transaction_date.localeCompare(b.transaction_date),
          )
          const monthly = txs[0].amount
          const firstDate = sorted[0].transaction_date
          return {
            name,
            monthly,
            annual: monthly * 12,
            firstDate,
            isLongTerm: new Date(firstDate) < sixMonthsAgo,
          }
        })
      setGroups(result)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [familyId])
  useRealtime('transactions', () => loadData())

  if (loading) return <Skeleton className="h-32 rounded-2xl" />
  if (groups.length === 0)
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Assinaturas</h2>
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-6 text-center">
            <Tv className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma assinatura recorrente encontrada</p>
          </CardContent>
        </Card>
      </section>
    )

  const totalMonthly = groups.reduce((s, g) => s + g.monthly, 0)
  const totalAnnual = totalMonthly * 12

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Assinaturas</h2>
        <Button variant="ghost" size="sm" onClick={onSeeDetails}>
          Ver detalhes
        </Button>
      </div>
      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Você tem <span className="font-bold text-gray-900">{groups.length} assinaturas</span>{' '}
            ativas somando{' '}
            <span className="font-bold text-gray-900">{formatBRL(totalMonthly)}</span> por mês (
            {formatBRL(totalAnnual)} por ano)
          </p>
          <div className="space-y-2">
            {groups.map((g) => (
              <div
                key={g.name}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Tv className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{g.name}</span>
                  {g.isLongTerm && (
                    <Badge className="bg-yellow-100 text-yellow-800">Há mais de 6 meses</Badge>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {formatBRL(g.monthly)}/mês
                  </span>
                  <span className="text-xs text-gray-500 block">{formatBRL(g.annual)}/ano</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
