import { useMemo, useState } from 'react'
import { ChevronDown, Clock, Lightbulb, CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatBRL } from '@/lib/utils'
import type { TransactionRecord, TransactionEmotion } from '@/types/finance'

interface EmotionMeta {
  value: TransactionEmotion
  emoji: string
  label: string
  /** base rgb triplet used to compute heatmap intensity */
  rgb: [number, number, number]
}

const EMOTIONS: EmotionMeta[] = [
  { value: 'happy', emoji: '😊', label: 'Feliz', rgb: [34, 197, 94] },
  { value: 'necessary', emoji: '✅', label: 'Necessário', rgb: [59, 130, 246] },
  { value: 'neutral', emoji: '😐', label: 'Neutro', rgb: [156, 163, 175] },
  { value: 'regret', emoji: '😬', label: 'Arrependido', rgb: [245, 158, 11] },
  { value: 'impulsive', emoji: '😤', label: 'Impulsivo', rgb: [239, 68, 68] },
]

const EMOTION_BY_VALUE = new Map(EMOTIONS.map((e) => [e.value, e]))

const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const WEEKDAYS_LONG = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

type TimeOfDay = 'manha' | 'tarde' | 'noite' | 'madrugada'

const PERIODS: { value: TimeOfDay; label: string; emoji: string }[] = [
  { value: 'manha', label: 'Manhã', emoji: '🌅' },
  { value: 'tarde', label: 'Tarde', emoji: '☀️' },
  { value: 'noite', label: 'Noite', emoji: '🌙' },
  { value: 'madrugada', label: 'Madrugada', emoji: '🌌' },
]

const PERIOD_LABEL_LONG: Record<TimeOfDay, string> = {
  manha: 'manhã',
  tarde: 'tarde',
  noite: 'noite',
  madrugada: 'madrugada',
}

function periodOf(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return 'manha'
  if (hour >= 12 && hour < 18) return 'tarde'
  if (hour >= 18 && hour < 24) return 'noite'
  return 'madrugada'
}

/** JS getDay(): 0=Dom..6=Sáb. We want 0=Seg..6=Dom. */
function weekdayIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

interface Props {
  transactions: TransactionRecord[]
}

interface CellAgg {
  total: number
  count: number
}

export function EmotionalTemporalAnalysis({ transactions }: Props) {
  const [expanded, setExpanded] = useState(false)

  const analysis = useMemo(() => {
    // emotion x weekday x period
    const heatmap = new Map<TransactionEmotion, CellAgg[]>() // [weekday] -> agg (sums across periods)
    const byWeekday = new Map<TransactionEmotion, CellAgg[]>() // weekday cells
    const byPeriod = new Map<TimeOfDay, Map<TransactionEmotion, CellAgg>>()
    let emotionTxCount = 0
    let meaningfulTimeCount = 0
    let totalTxWithTime = 0

    for (const e of EMOTIONS) {
      heatmap.set(
        e.value,
        Array.from({ length: 7 }, () => ({ total: 0, count: 0 })),
      )
      byWeekday.set(
        e.value,
        Array.from({ length: 7 }, () => ({ total: 0, count: 0 })),
      )
    }
    for (const p of PERIODS) byPeriod.set(p.value, new Map())

    for (const tx of transactions) {
      const emotion = tx.emotion
      if (!emotion) continue
      const meta = EMOTION_BY_VALUE.get(emotion)
      if (!meta) continue // unknown emotion (e.g. anxious) — skip to keep grid stable
      if (tx.type === 'income') continue
      const amount = tx.amount
      if (amount <= 0) continue

      emotionTxCount++

      const dateStr = tx.transaction_date
      if (!dateStr) continue
      const d = new Date(dateStr)
      if (Number.isNaN(d.getTime())) continue

      const wd = weekdayIndex(d.getDay())
      const hour = d.getHours()

      // detect whether the stored time is meaningful (manual entries default to 12:00)
      const min = d.getMinutes()
      const sec = d.getSeconds()
      const isDefaultTime = hour === 12 && min === 0 && sec === 0
      totalTxWithTime++
      if (!isDefaultTime) meaningfulTimeCount++

      const period = periodOf(hour)

      const wdArr = byWeekday.get(emotion)!
      wdArr[wd].total += amount
      wdArr[wd].count += 1

      // heatmap cell aggregates across all periods (weekday x emotion)
      const hmArr = heatmap.get(emotion)!
      hmArr[wd].total += amount
      hmArr[wd].count += 1

      let pMap = byPeriod.get(period)!
      let agg = pMap.get(emotion)
      if (!agg) {
        agg = { total: 0, count: 0 }
        pMap.set(emotion, agg)
      }
      agg.total += amount
      agg.count += 1
    }

    const timeAvailable = meaningfulTimeCount > 0

    // global max for heatmap intensity
    let maxCell = 0
    for (const e of EMOTIONS) {
      for (const c of heatmap.get(e.value)!) {
        if (c.total > maxCell) maxCell = c.total
      }
    }

    // period totals + dominant emotion per period
    const periodRows = PERIODS.map((p) => {
      const pMap = byPeriod.get(p.value)!
      let total = 0
      let dominant: { emotion: EmotionMeta; total: number; count: number } | null = null
      for (const e of EMOTIONS) {
        const agg = pMap.get(e.value)
        if (!agg) continue
        total += agg.total
        if (!dominant || agg.total > dominant.total) {
          dominant = { emotion: e, total: agg.total, count: agg.count }
        }
      }
      return { period: p, total, dominant }
    })
    const maxPeriodTotal = Math.max(1, ...periodRows.map((r) => r.total))

    // weekday totals (column totals)
    const weekdayTotals = Array.from({ length: 7 }, (_, i) => {
      let total = 0
      let count = 0
      for (const e of EMOTIONS) {
        const c = byWeekday.get(e.value)![i]
        total += c.total
        count += c.count
      }
      return { total, count }
    })

    return {
      heatmap,
      byWeekday,
      byPeriod,
      emotionTxCount,
      maxCell,
      periodRows,
      maxPeriodTotal,
      weekdayTotals,
      timeAvailable,
    }
  }, [transactions])

  const insights = useMemo(() => buildInsights(analysis), [analysis])

  // Not enough data
  if (analysis.emotionTxCount < 5) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            Padrões Temporais
            <Badge className="ml-1 bg-emerald-500 text-white hover:bg-emerald-500">Novo!</Badge>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-emerald-700 dark:text-emerald-400 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>
        {expanded && (
          <div className="mt-2 rounded-lg bg-muted/30 p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Registre emoções em mais transações para ver padrões temporais.
              <br />
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                ({analysis.emotionTxCount}/5 transações com emoção registrada)
              </span>
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <Clock className="h-3.5 w-3.5" />
          Padrões Temporais
          <Badge className="ml-1 bg-emerald-500 text-white hover:bg-emerald-500">Novo!</Badge>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-emerald-700 dark:text-emerald-400 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* HEATMAP emotion x weekday */}
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <CalendarDays className="h-3.5 w-3.5" />
              Gasto por emoção × dia da semana
            </h4>
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <div className="min-w-[420px]">
                {/* header row */}
                <div className="grid grid-cols-[84px_repeat(7,minmax(0,1fr))] gap-1">
                  <div />
                  {WEEKDAYS_SHORT.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {/* emotion rows */}
                {EMOTIONS.map((meta) => {
                  const cells = analysis.heatmap.get(meta.value)!
                  return (
                    <div
                      key={meta.value}
                      className="mt-1 grid grid-cols-[84px_repeat(7,minmax(0,1fr))] gap-1"
                    >
                      <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300 truncate">
                        <span aria-hidden="true">{meta.emoji}</span>
                        <span className="truncate">{meta.label}</span>
                      </div>
                      {cells.map((cell, i) => {
                        const intensity =
                          analysis.maxCell > 0 && cell.total > 0
                            ? 0.18 + 0.82 * (cell.total / analysis.maxCell)
                            : 0
                        const bg =
                          cell.total > 0
                            ? `rgba(${meta.rgb[0]}, ${meta.rgb[1]}, ${meta.rgb[2]}, ${intensity.toFixed(
                                3,
                              )})`
                            : undefined
                        return (
                          <div
                            key={i}
                            title={`${WEEKDAYS_LONG[i]}: ${formatBRL(cell.total)} em gastos ${meta.label.toLowerCase()} (${cell.count} transações)`}
                            className={cn(
                              'flex h-9 items-center justify-center rounded-md text-[10px] font-medium transition-colors',
                              cell.total > 0
                                ? 'text-gray-900 dark:text-white'
                                : 'bg-muted/20 text-gray-300 dark:text-gray-600',
                            )}
                            style={bg ? { backgroundColor: bg } : undefined}
                          >
                            {cell.total > 0 ? compactBRL(cell.total) : '—'}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {/* column totals */}
                <div className="mt-1 grid grid-cols-[84px_repeat(7,minmax(0,1fr))] gap-1">
                  <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 self-center">
                    Total
                  </div>
                  {analysis.weekdayTotals.map((wt, i) => (
                    <div
                      key={i}
                      className="text-center text-[10px] font-semibold text-gray-600 dark:text-gray-300"
                    >
                      {wt.total > 0 ? compactBRL(wt.total) : '—'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BAR CHART by period of day */}
          {analysis.timeAvailable ? (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Gasto por período do dia
              </h4>
              <div className="space-y-1.5">
                {analysis.periodRows.map((row) => {
                  const widthPct =
                    analysis.maxPeriodTotal > 0 ? (row.total / analysis.maxPeriodTotal) * 100 : 0
                  const dom = row.dominant
                  const barColor = dom
                    ? `rgb(${dom.emotion.rgb[0]}, ${dom.emotion.rgb[1]}, ${dom.emotion.rgb[2]})`
                    : 'rgb(156,163,175)'
                  return (
                    <div key={row.period.value} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs text-gray-600 dark:text-gray-300">
                        {row.period.emoji} {row.period.label}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all flex items-center justify-end pr-1.5"
                          style={{
                            width: `${Math.max(widthPct, row.total > 0 ? 6 : 0)}%`,
                            backgroundColor: barColor,
                          }}
                        >
                          {dom && row.total > 0 && (
                            <span className="text-[10px] font-medium text-white/95 whitespace-nowrap">
                              {dom.emotion.emoji}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'w-24 text-right shrink-0 text-xs font-medium whitespace-nowrap',
                          row.total > 0
                            ? 'text-gray-900 dark:text-foreground'
                            : 'text-gray-400 dark:text-gray-500',
                        )}
                      >
                        {dom ? `${dom.emotion.emoji} ` : ''}
                        {formatBRL(row.total)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/20 p-3">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                ⏰ Suas transações não têm horário registrado (apenas a data). O gráfico por período
                do dia aparece quando os horários das compras são informados. A análise por dia da
                semana acima já está disponível.
              </p>
            </div>
          )}

          {/* INSIGHTS */}
          {insights.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Lightbulb className="h-3.5 w-3.5" />
                Insights automáticos
              </h4>
              <div className="space-y-1.5">
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-3 py-2"
                  >
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {ins}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TemporalAnalysis {
  heatmap: Map<TransactionEmotion, CellAgg[]>
  byWeekday: Map<TransactionEmotion, CellAgg[]>
  byPeriod: Map<TimeOfDay, Map<TransactionEmotion, CellAgg>>
  emotionTxCount: number
  maxCell: number
  periodRows: { period: (typeof PERIODS)[number]; total: number; dominant: any }[]
  maxPeriodTotal: number
  weekdayTotals: { total: number; count: number }[]
  timeAvailable: boolean
}

function buildInsights(a: TemporalAnalysis): string[] {
  const out: string[] = []

  if (a.timeAvailable) {
    // 1) Maior pico emotion x period, com weekday que mais contribui p/ essa emoção
    let peak: {
      emotion: EmotionMeta
      wd: number
      period: TimeOfDay
      total: number
      count: number
    } | null = null
    for (const e of EMOTIONS) {
      for (const p of PERIODS) {
        const agg = a.byPeriod.get(p.value)?.get(e.value)
        if (!agg || agg.total <= 0) continue
        if (!peak || agg.total > peak.total) {
          peak = { emotion: e, wd: -1, period: p.value, total: agg.total, count: agg.count }
        }
      }
    }
    if (peak) {
      const wdArr = a.byWeekday.get(peak.emotion.value)!
      let bestWd = 0
      let bestWdTotal = -1
      wdArr.forEach((c, i) => {
        if (c.total > bestWdTotal) {
          bestWdTotal = c.total
          bestWd = i
        }
      })
      peak.wd = bestWd
      out.push(
        `Você gasta mais às ${WEEKDAYS_LONG[peak.wd]}s à ${PERIOD_LABEL_LONG[peak.period]} por ${peak.emotion.label.toLowerCase()} — ${formatBRL(peak.total)}.`,
      )
    }

    // 2) Concentração: período representa >=40% dos gastos de uma emoção
    let pattern: { emotion: EmotionMeta; period: TimeOfDay; pct: number; total: number } | null =
      null
    for (const e of EMOTIONS) {
      let eTotal = 0
      for (const pp of PERIODS) eTotal += a.byPeriod.get(pp.value)?.get(e.value)?.total || 0
      if (eTotal <= 0) continue
      for (const p of PERIODS) {
        const agg = a.byPeriod.get(p.value)?.get(e.value)
        if (!agg || agg.total <= 0) continue
        const pct = agg.total / eTotal
        if (pct >= 0.4 && agg.total >= 50 && (!pattern || pct > pattern.pct)) {
          pattern = { emotion: e, period: p.value, pct, total: agg.total }
        }
      }
    }
    if (pattern) {
      const pct = Math.round(pattern.pct * 100)
      out.push(
        `${capitalize(PERIOD_LABEL_LONG[pattern.period])}s representam ${pct}% dos seus gastos ${pattern.emotion.label.toLowerCase()} (${formatBRL(pattern.total)}).`,
      )
    }

    // 3) Ausência de gastos de madrugada
    const madrugada = a.periodRows.find((r) => r.period.value === 'madrugada')
    if (madrugada && madrugada.total === 0) {
      out.push('Você não tem gastos registrados de madrugada — ótimo!')
    }
  } else {
    // Sem horário: análise só por dia da semana
    let wdPeak: { emotion: EmotionMeta; wd: number; total: number; count: number } | null = null
    for (const e of EMOTIONS) {
      const arr = a.byWeekday.get(e.value)!
      arr.forEach((c, i) => {
        if (c.total > 0 && (!wdPeak || c.total > wdPeak.total)) {
          wdPeak = { emotion: e, wd: i, total: c.total, count: c.count }
        }
      })
    }
    if (wdPeak) {
      out.push(
        `Seu maior pico de gasto é às ${WEEKDAYS_LONG[wdPeak.wd]}s por ${wdPeak.emotion.label.toLowerCase()} — ${formatBRL(wdPeak.total)} (${wdPeak.count} transações).`,
      )
    }

    let pattern: { emotion: EmotionMeta; wd: number; pct: number; total: number } | null = null
    for (const e of EMOTIONS) {
      const arr = a.byWeekday.get(e.value)!
      const eTotal = arr.reduce((s, c) => s + c.total, 0)
      if (eTotal <= 0) continue
      arr.forEach((c, i) => {
        if (c.total <= 0) return
        const pct = c.total / eTotal
        if (pct >= 0.4 && (!pattern || pct > pattern.pct)) {
          pattern = { emotion: e, wd: i, pct, total: c.total }
        }
      })
    }
    if (pattern) {
      const pct = Math.round(pattern.pct * 100)
      out.push(
        `${WEEKDAYS_LONG[pattern.wd]}s representam ${pct}% dos seus gastos ${pattern.emotion.label.toLowerCase()} (${formatBRL(pattern.total)}).`,
      )
    }

    const sabTotal = a.weekdayTotals[5]?.total || 0
    const domTotal = a.weekdayTotals[6]?.total || 0
    if (sabTotal === 0 && domTotal === 0) {
      out.push('Você não tem gastos registrados aos finais de semana — ótimo controle!')
    }
  }

  return out.slice(0, 4)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Compact BRL for tight heatmap cells: R$ 1,2k, R$ 12,3k */
function compactBRL(v: number): string {
  if (v >= 1000) {
    const k = v / 1000
    return `R$ ${k.toFixed(k >= 10 ? 0 : 1).replace('.', ',')}k`
  }
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`
}
