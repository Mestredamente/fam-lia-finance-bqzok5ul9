import { CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFutureInstallments } from '@/hooks/use-future-installments'
import { formatBRL, getMonthName } from '@/lib/utils'

interface Props {
  familyId: string
  /** When true (edit mode), always render a skeleton placeholder even with no
   * installments so the user can still see/move the card. */
  forceRender?: boolean
}

export function ComprometimentoFuturoCard({ familyId, forceRender }: Props) {
  const { installments, loading } = useFutureInstallments(familyId)

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Comprometimento futuro</h2>
        <Skeleton className="h-28 rounded-2xl" />
      </section>
    )
  }

  if (installments.length === 0 && !forceRender) return null

  const total = installments.reduce((s, t) => s + t.amount, 0)

  const monthlyMap: Record<string, { total: number; count: number }> = {}
  for (const tx of installments) {
    const key = tx.transaction_date.substring(0, 7)
    if (!monthlyMap[key]) monthlyMap[key] = { total: 0, count: 0 }
    monthlyMap[key].total += tx.amount
    monthlyMap[key].count += 1
  }

  const months = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b))

  if (installments.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Comprometimento futuro</h2>
        <Card className="border-dashed border-gray-200 rounded-2xl bg-white">
          <CardContent className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <CalendarClock className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-500">
              Nenhum comprometimento futuro em parcelas no momento.
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Comprometimento futuro</h2>
      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">
                Comprometimento futuro em parcelas
              </span>
              <span className="text-2xl font-extrabold text-amber-700">{formatBRL(total)}</span>
              <span className="text-xs text-gray-500 ml-2">({installments.length} parcelas)</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {months.map(([key, data]) => {
              const [y, m] = key.split('-')
              return (
                <div
                  key={key}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-700 capitalize">
                    {getMonthName(parseInt(m, 10) - 1)} {y}
                  </span>
                  <span className="text-gray-500">
                    {formatBRL(data.total)} ({data.count}{' '}
                    {data.count === 1 ? 'parcela' : 'parcelas'})
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
