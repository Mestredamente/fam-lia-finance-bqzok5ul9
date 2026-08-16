import { useMemo } from 'react'
import { Brain } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL, cn } from '@/lib/utils'
import { useTransactions } from '@/hooks/use-transactions'
import type { TransactionEmotion } from '@/types/finance'

interface EmotionMeta {
  value: TransactionEmotion
  emoji: string
  label: string
  barColor: string
}

const EMOTIONS: EmotionMeta[] = [
  { value: 'happy', emoji: '😊', label: 'Feliz', barColor: 'bg-green-500' },
  { value: 'necessary', emoji: '✅', label: 'Necessário', barColor: 'bg-blue-500' },
  { value: 'neutral', emoji: '😐', label: 'Neutro', barColor: 'bg-gray-400' },
  { value: 'regret', emoji: '😬', label: 'Arrependido', barColor: 'bg-amber-500' },
  { value: 'impulsive', emoji: '😤', label: 'Impulsivo', barColor: 'bg-red-500' },
]

const EMOTION_LABEL: Record<TransactionEmotion, string> = {
  happy: 'alegria',
  necessary: 'necessidade',
  neutral: 'neutralidade',
  regret: 'arrependimento',
  impulsive: 'impulso',
}

interface Props {
  familyId: string
  year: number
  month: number
  loading?: boolean
}

export function EmotionalSpendingCard({ familyId, year, month, loading }: Props) {
  const { transactions, loading: txLoading } = useTransactions(familyId, year, month)

  const analysis = useMemo(() => {
    const byEmotion = new Map<TransactionEmotion, number>()
    const byEmotionCategory = new Map<
      TransactionEmotion,
      Map<string, { total: number; name: string }>
    >()

    for (const tx of transactions) {
      const emotion = tx.emotion
      if (!emotion) continue
      const amount = tx.type === 'income' ? 0 : tx.amount
      if (amount <= 0) continue

      byEmotion.set(emotion, (byEmotion.get(emotion) || 0) + amount)

      const catId = tx.category_id
      const catName = tx.expand?.category_id?.name || 'Sem categoria'
      let catMap = byEmotionCategory.get(emotion)
      if (!catMap) {
        catMap = new Map()
        byEmotionCategory.set(emotion, catMap)
      }
      const existing = catMap.get(catId) || { total: 0, name: catName }
      existing.total += amount
      existing.name = catName
      catMap.set(catId, existing)
    }

    const totalSpending = Array.from(byEmotion.values()).reduce((s, v) => s + v, 0)

    const ranked = EMOTIONS.map((meta) => {
      const total = byEmotion.get(meta.value) || 0
      const catMap = byEmotionCategory.get(meta.value)
      let topCat: { name: string; total: number } | null = null
      if (catMap) {
        for (const [, val] of catMap) {
          if (!topCat || val.total > topCat.total) {
            topCat = { name: val.name, total: val.total }
          }
        }
      }
      return { ...meta, total, topCat }
    })
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total)

    return { byEmotion, ranked, totalSpending }
  }, [transactions])

  const isLoading = loading || txLoading

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-[#166534]" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-foreground">
              Padrões Emocionais de Gasto
            </h2>
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  const hasData = analysis.ranked.length > 0
  const maxValue = analysis.ranked.length ? Math.max(...analysis.ranked.map((r) => r.total)) : 1

  const dominant = analysis.ranked[0]
  const dominantPct = analysis.totalSpending > 0 ? dominant.total / analysis.totalSpending : 0
  const isDominant = dominantPct > 0.5

  let insight: string
  if (!hasData) {
    insight = 'Comece a marcar suas emoções nas transações para ver padrões aqui.'
  } else if (isDominant) {
    const pct = Math.round(dominantPct * 100)
    const topCatName = dominant.topCat?.name || '—'
    switch (dominant.value) {
      case 'necessary':
        insight = `${pct}% dos seus gastos este mês foram necessários. Bom controle!`
        break
      case 'impulsive':
        insight = `Você gastou ${formatBRL(dominant.total)} em compras impulsivas. Considere esperar 24h antes de comprar online.`
        break
      case 'regret':
        insight = `Compras com arrependimento somam ${formatBRL(dominant.total)}. Sua principal categoria de arrependimento é ${topCatName}.`
        break
      case 'happy':
        insight = `${pct}% dos seus gastos trouxeram felicidade. Sua principal categoria de alegria é ${topCatName}.`
        break
      default:
        insight = `Sua emoção dominante este mês foi ${dominant.label.toLowerCase()}, com ${formatBRL(dominant.total)} (${pct}% do total).`
    }
  } else {
    insight = `Sua emoção com maior gasto foi ${dominant.label.toLowerCase()} (${formatBRL(dominant.total)}), mas nenhuma emoção domina mais de 50% dos seus gastos — bom equilíbrio.`
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-[#166534]" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-foreground">
            Padrões Emocionais de Gasto
          </h2>
        </div>

        {/* a) Gasto por Emoção */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Gasto por Emoção
          </h3>
          <div className="space-y-1.5">
            {EMOTIONS.map((meta) => {
              const total = analysis.byEmotion.get(meta.value) || 0
              const widthPct = maxValue > 0 ? (total / maxValue) * 100 : 0
              return (
                <div key={meta.value} className="flex items-center gap-2">
                  <span className="text-sm w-28 shrink-0 flex items-center gap-1">
                    <span aria-hidden="true">{meta.emoji}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300">{meta.label}</span>
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
                    <div
                      className={cn('h-full rounded-md transition-all', meta.barColor)}
                      style={{ width: `${Math.max(widthPct, total > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium w-20 text-right shrink-0',
                      total > 0
                        ? 'text-gray-900 dark:text-foreground'
                        : 'text-gray-400 dark:text-gray-500',
                    )}
                  >
                    {formatBRL(total)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* b) Top Categorias por Emoção */}
        {hasData && (
          <div className="mt-4 space-y-1.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Top Categorias por Emoção
            </h3>
            {analysis.ranked.slice(0, 3).map((r) => (
              <div key={r.value} className="flex items-center gap-2 text-xs">
                <span aria-hidden="true" className="text-sm">
                  {r.emoji}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{r.label}:</span>
                <span className="text-gray-600 dark:text-gray-300 truncate flex-1">
                  {r.topCat?.name || '—'}
                </span>
                <span className="font-medium text-gray-900 dark:text-foreground whitespace-nowrap">
                  {formatBRL(r.topCat?.total || r.total)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* c) Insight */}
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-[#166534] dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
