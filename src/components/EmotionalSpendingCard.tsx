import { useMemo, useEffect } from 'react'
import { Brain, Lightbulb, AlertTriangle, BookOpen, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBRL, cn } from '@/lib/utils'
import { useTransactions } from '@/hooks/use-transactions'
import { useAuth } from '@/hooks/use-auth'
import { useEmotionalInsights } from '@/hooks/use-emotional-insights'
import { EmotionalTemporalAnalysis } from '@/components/EmotionalTemporalAnalysis'
import type { EmotionalInsightsContext } from '@/services/ai-advisor'
import type { AIInsight, TransactionEmotion } from '@/types/finance'

/** Map internal emotion values to the Portuguese keys the AI prompt expects. */
const EMOTION_KEY: Record<TransactionEmotion, string> = {
  happy: 'feliz',
  necessary: 'necessario',
  neutral: 'neutro',
  regret: 'arrependido',
  impulsive: 'impulsivo',
}

const WEEKDAYS_LONG = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

type TimeOfDay = 'manha' | 'tarde' | 'noite' | 'madrugada'

function periodOf(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return 'manha'
  if (hour >= 12 && hour < 18) return 'tarde'
  if (hour >= 18 && hour < 24) return 'noite'
  return 'madrugada'
}

const PERIOD_LABEL: Record<TimeOfDay, string> = {
  manha: 'manhã',
  tarde: 'tarde',
  noite: 'noite',
  madrugada: 'madrugada',
}

const INSIGHT_ICON: Record<AIInsight['tipo'], typeof Brain> = {
  alerta: AlertTriangle,
  oportunidade: Lightbulb,
  educacao: BookOpen,
  comportamento: Brain,
}

/** weekday index 0=Seg..6=Dom from a JS Date */
function weekdayIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

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
  /** Notifies the parent whenever AI insights are loaded (non-empty only). */
  onInsightsLoaded?: (insights: AIInsight[]) => void
}

export function EmotionalSpendingCard({ familyId, year, month, loading, onInsightsLoaded }: Props) {
  const { transactions, loading: txLoading } = useTransactions(familyId, year, month)
  const { member } = useAuth()
  const memberId = member?.id

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

  // ---- Build the EmotionalInsightsContext for the AI ----
  // Aggregates temporal data (weekday/period) alongside the emotion breakdown.
  const aiContext = useMemo<EmotionalInsightsContext | null>(() => {
    const breakdown: EmotionalInsightsContext['breakdown'] = {}
    let totalEmotionalSpending = 0
    let totalTxWithEmotion = 0

    // per-emotion totals + top category (reuse analysis.ranked where possible)
    for (const r of analysis.ranked) {
      const key = EMOTION_KEY[r.value]
      breakdown[key] = {
        total: r.total,
        count: 0, // filled below
        top_category: r.topCat?.name || null,
      }
      totalEmotionalSpending += r.total
    }

    // weekday x period aggregation for temporal insights
    const byWeekday = new Map<TransactionEmotion, number[]>()
    const byPeriod = new Map<TimeOfDay, Map<TransactionEmotion, number>>()
    let meaningfulTimeCount = 0
    let totalTxWithTime = 0
    let hasHeatmapData = false
    let noLateNight = true

    for (const e of Object.keys(EMOTION_KEY) as TransactionEmotion[]) {
      byWeekday.set(e, Array(7).fill(0))
    }

    for (const tx of transactions) {
      const emotion = tx.emotion
      if (!emotion) continue
      if (tx.type === 'income') continue
      if (tx.amount <= 0) continue
      totalTxWithEmotion++
      // increment count in breakdown
      const key = EMOTION_KEY[emotion]
      if (breakdown[key]) breakdown[key].count += 1
      else
        breakdown[key] = {
          total: tx.amount,
          count: 1,
          top_category: tx.expand?.category_id?.name || null,
        }

      const dateStr = tx.transaction_date
      if (!dateStr) continue
      const d = new Date(dateStr)
      if (Number.isNaN(d.getTime())) continue

      const wd = weekdayIndex(d.getDay())
      const hour = d.getHours()
      const min = d.getMinutes()
      const sec = d.getSeconds()
      const isDefaultTime = hour === 12 && min === 0 && sec === 0
      totalTxWithTime++
      if (!isDefaultTime) meaningfulTimeCount++

      const wdArr = byWeekday.get(emotion)
      if (wdArr) {
        wdArr[wd] += tx.amount
        hasHeatmapData = true
      }

      const period = periodOf(hour)
      if (period === 'madrugada' && !isDefaultTime) noLateNight = false
      let pMap = byPeriod.get(period)
      if (!pMap) {
        pMap = new Map()
        byPeriod.set(period, pMap)
      }
      pMap.set(emotion, (pMap.get(emotion) || 0) + tx.amount)
    }

    const timeAvailable = meaningfulTimeCount > 0

    // dominant emotion
    const dominant = analysis.ranked[0] || null
    const dominantPct =
      dominant && analysis.totalSpending > 0 ? dominant.total / analysis.totalSpending : 0

    // peak: emotion x period with the highest total (only when timeAvailable)
    let peak: EmotionalInsightsContext['temporal']['peak'] = null
    if (timeAvailable) {
      let bestTotal = -1
      let bestEmotion: TransactionEmotion | null = null
      let bestPeriod: TimeOfDay | null = null
      for (const [period, pMap] of byPeriod) {
        for (const [emotion, total] of pMap) {
          if (total > bestTotal) {
            bestTotal = total
            bestEmotion = emotion
            bestPeriod = period
          }
        }
      }
      if (bestEmotion && bestPeriod && bestTotal > 0) {
        // best weekday for that emotion
        const wdArr = byWeekday.get(bestEmotion)!
        let bestWd = 0
        let bestWdTotal = -1
        wdArr.forEach((v, i) => {
          if (v > bestWdTotal) {
            bestWdTotal = v
            bestWd = i
          }
        })
        peak = {
          emotion: EMOTION_KEY[bestEmotion],
          weekday: WEEKDAYS_LONG[bestWd],
          period: PERIOD_LABEL[bestPeriod],
          total: bestTotal,
        }
      }
    }

    // concentration: period represents >=40% of an emotion's spending
    let concentration: EmotionalInsightsContext['temporal']['concentration'] = null
    if (timeAvailable) {
      for (const e of Object.keys(EMOTION_KEY) as TransactionEmotion[]) {
        let eTotal = 0
        for (const pMap of byPeriod.values()) eTotal += pMap.get(e) || 0
        if (eTotal <= 0) continue
        for (const [period, pMap] of byPeriod) {
          const total = pMap.get(e) || 0
          if (total <= 0) continue
          const pct = total / eTotal
          if (pct >= 0.4 && total >= 50 && (!concentration || pct > concentration.pct)) {
            concentration = {
              emotion: EMOTION_KEY[e],
              period: PERIOD_LABEL[period],
              pct: Math.round(pct * 100),
              total,
            }
          }
        }
      }
    }

    return {
      month,
      year,
      total_transactions_with_emotion: totalTxWithEmotion,
      total_emotional_spending: totalEmotionalSpending,
      breakdown,
      dominant_emotion: dominant ? EMOTION_KEY[dominant.value] : null,
      dominant_pct: Math.round(dominantPct * 100),
      is_dominant: dominantPct > 0.5,
      temporal: {
        time_available: timeAvailable,
        peak,
        concentration,
        no_late_night_spending: noLateNight,
        heatmap_has_data: hasHeatmapData,
      },
    }
  }, [analysis, transactions, month, year])

  const hasEmotionData = analysis.ranked.length > 0
  const hasEnoughData = aiContext ? aiContext.total_transactions_with_emotion >= 5 : false

  // Static fallback insight (same rules as before, kept as fallback)
  const staticFallbackInsight = useMemo(() => {
    if (!hasEmotionData) {
      return ['Comece a marcar suas emoções nas transações para ver padrões aqui.']
    }
    const dominant = analysis.ranked[0]
    const dominantPct = analysis.totalSpending > 0 ? dominant.total / analysis.totalSpending : 0
    const isDominant = dominantPct > 0.5
    if (isDominant) {
      const pct = Math.round(dominantPct * 100)
      const topCatName = dominant.topCat?.name || '—'
      switch (dominant.value) {
        case 'necessary':
          return [`${pct}% dos seus gastos este mês foram necessários. Bom controle!`]
        case 'impulsive':
          return [
            `Você gastou ${formatBRL(dominant.total)} em compras impulsivas. Considere esperar 24h antes de comprar online.`,
          ]
        case 'regret':
          return [
            `Compras com arrependimento somam ${formatBRL(dominant.total)}. Sua principal categoria de arrependimento é ${topCatName}.`,
          ]
        case 'happy':
          return [
            `${pct}% dos seus gastos trouxeram felicidade. Sua principal categoria de alegria é ${topCatName}.`,
          ]
        default:
          return [
            `Sua emoção dominante este mês foi ${dominant.label.toLowerCase()}, com ${formatBRL(dominant.total)} (${pct}% do total).`,
          ]
      }
    }
    return [
      `Sua emoção com maior gasto foi ${dominant.label.toLowerCase()} (${formatBRL(dominant.total)}), mas nenhuma emoção domina mais de 50% dos seus gastos — bom equilíbrio.`,
    ]
  }, [analysis, hasEmotionData])

  const { aiInsights, loading: aiLoading } = useEmotionalInsights(
    familyId,
    memberId,
    aiContext,
    staticFallbackInsight,
    hasEnoughData,
  )

  // Communicate AI insights back to the parent (e.g. for PDF export) whenever
  // they change. Only called with non-empty arrays so a loading/fallback state
  // never overwrites previously-loaded valid insights.
  useEffect(() => {
    if (aiInsights.length > 0 && onInsightsLoaded) {
      onInsightsLoaded(aiInsights)
    }
  }, [aiInsights, onInsightsLoaded])

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

        {/* c) Insight — IA (Gemini) com fallback estático */}
        <div className="mt-4 space-y-2">
          {aiLoading ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Gerando insights com IA...
                </span>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : aiInsights.length > 0 ? (
            <div className="space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Insights da IA
              </h3>
              {aiInsights.map((ins, i) => {
                const Icon = INSIGHT_ICON[ins.tipo] || Brain
                return (
                  <div
                    key={i}
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-[#166534] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-foreground leading-snug">
                          {ins.titulo}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mt-0.5">
                          {ins.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-[#166534] dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {staticFallbackInsight[0]}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* d) Padrões Temporais (heatmap + período do dia + insights) */}
        <EmotionalTemporalAnalysis transactions={transactions} aiInsights={aiInsights} />
      </CardContent>
    </Card>
  )
}
