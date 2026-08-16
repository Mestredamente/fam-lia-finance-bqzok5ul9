import { useCallback, useRef } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatBRL, getMonthName } from '@/lib/utils'
import type { MemberRecord, TransactionRecord, TransactionEmotion } from '@/types/finance'

const PAGE_W = 210 // A4 width in mm
const PAGE_H = 297
const MARGIN = 15
const CONTENT_W = PAGE_W - MARGIN * 2

// ---- Emotion metadata (mirrors EmotionalSpendingCard / EmotionalTemporalAnalysis) ----
interface EmotionMeta {
  value: TransactionEmotion
  emoji: string
  label: string
  hex: string
  rgb: [number, number, number]
}

const EMOTIONS: EmotionMeta[] = [
  { value: 'happy', emoji: '😊', label: 'Feliz', hex: '#22C55E', rgb: [34, 197, 94] },
  { value: 'necessary', emoji: '✅', label: 'Necessário', hex: '#3B82F6', rgb: [59, 130, 246] },
  { value: 'neutral', emoji: '😐', label: 'Neutro', hex: '#9CA3AF', rgb: [156, 163, 175] },
  { value: 'regret', emoji: '😬', label: 'Arrependido', hex: '#F59E0B', rgb: [245, 158, 11] },
  { value: 'impulsive', emoji: '😤', label: 'Impulsivo', hex: '#EF4444', rgb: [239, 68, 68] },
]

const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const WEEKDAYS_LONG = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const COLORS = {
  income: '#16A34A',
  incomeBg: '#F0FDF4',
  expense: '#DC2626',
  expenseBg: '#FEF2F2',
  balancePos: '#16A34A',
  balanceNeg: '#DC2626',
  balanceBg: '#EFF6FF',
  primary: '#166534',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  headerBg: '#166534',
  sectionBg: '#064E3B',
}

const EMOTION_HEX: Record<string, string> = Object.fromEntries(
  EMOTIONS.map((e) => [e.value, e.hex]),
)

export interface DashboardPdfData {
  familyName: string
  month: number // 0-based
  year: number
  transactions: TransactionRecord[]
  members: MemberRecord[]
  memberSummaries: Record<string, { totalReceitas: number; totalDespesas: number; saldo: number }>
  futureInstallments: TransactionRecord[]
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function shortMemberName(displayName: string): string {
  if (!displayName) return 'Membro'
  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1]}`
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

interface EmotionAgg {
  total: number
  count: number
  perWeekday: number[] // length 7
}

interface AggResult {
  byEmotion: Map<TransactionEmotion, EmotionAgg>
  maxCell: number
  totalEmotional: number
  emotionTxCount: number
  weekdayTotals: number[]
}

function aggregateEmotions(transactions: TransactionRecord[]): AggResult {
  const byEmotion = new Map<TransactionEmotion, EmotionAgg>()
  for (const e of EMOTIONS) {
    byEmotion.set(e.value, { total: 0, count: 0, perWeekday: Array(7).fill(0) })
  }
  let maxCell = 0
  let totalEmotional = 0
  let emotionTxCount = 0
  const weekdayTotals = Array(7).fill(0)

  for (const tx of transactions) {
    const emotion = tx.emotion
    if (!emotion) continue
    const agg = byEmotion.get(emotion)
    if (!agg) continue
    if (tx.type === 'income') continue
    if (tx.amount <= 0) continue
    emotionTxCount++
    agg.total += tx.amount
    agg.count += 1
    totalEmotional += tx.amount

    const d = new Date(tx.transaction_date)
    if (!Number.isNaN(d.getTime())) {
      const wd = (d.getDay() + 6) % 7
      agg.perWeekday[wd] += tx.amount
      weekdayTotals[wd] += tx.amount
      if (agg.perWeekday[wd] > maxCell) maxCell = agg.perWeekday[wd]
    }
  }

  return { byEmotion, maxCell, totalEmotional, emotionTxCount, weekdayTotals }
}

function buildEmotionInsights(a: AggResult): string[] {
  const out: string[] = []
  if (a.emotionTxCount === 0) return out

  const ranked = EMOTIONS.map((e) => ({
    meta: e,
    total: a.byEmotion.get(e.value)!.total,
    count: a.byEmotion.get(e.value)!.count,
  }))
    .filter((r) => r.total > 0)
    .sort((x, y) => y.total - x.total)

  if (ranked.length === 0) return out
  const top = ranked[0]
  const pct = a.totalEmotional > 0 ? Math.round((top.total / a.totalEmotional) * 100) : 0

  if (pct >= 50) {
    switch (top.meta.value) {
      case 'necessary':
        out.push(`${pct}% dos seus gastos este mês foram necessários. Bom controle!`)
        break
      case 'impulsive':
        out.push(
          `Você gastou ${formatBRL(top.total)} em compras impulsivas. Considere esperar 24h antes de comprar online.`,
        )
        break
      case 'regret':
        out.push(`Compras com arrependimento somam ${formatBRL(top.total)}.`)
        break
      case 'happy':
        out.push(`${pct}% dos seus gastos trouxeram felicidade.`)
        break
      default:
        out.push(
          `Sua emoção dominante foi ${top.meta.label.toLowerCase()}, com ${formatBRL(top.total)} (${pct}% do total).`,
        )
    }
  } else {
    out.push(
      `Sua emoção com maior gasto foi ${top.meta.label.toLowerCase()} (${formatBRL(top.total)}), mas nenhuma emoção domina mais de 50% dos seus gastos — bom equilíbrio.`,
    )
  }

  // peak weekday
  let peakWd = -1
  let peakWdTotal = 0
  a.weekdayTotals.forEach((v, i) => {
    if (v > peakWdTotal) {
      peakWdTotal = v
      peakWd = i
    }
  })
  if (peakWd >= 0 && peakWdTotal > 0) {
    out.push(`Seu maior pico de gasto é às ${WEEKDAYS_LONG[peakWd]}s — ${formatBRL(peakWdTotal)}.`)
  }

  const sab = a.weekdayTotals[5] || 0
  const dom = a.weekdayTotals[6] || 0
  if (sab === 0 && dom === 0 && a.emotionTxCount > 0) {
    out.push('Você não tem gastos registrados aos finais de semana — ótimo controle!')
  }

  return out.slice(0, 3)
}

/**
 * Off-screen, zero-size container that renders the donut chart + emotional
 * heatmap so html2canvas can capture them as images. Always present in the DOM
 * (visually hidden via fixed positioning off-screen), never interactive.
 */
export function PdfCaptureTargets({
  containerRef,
  data,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  data: DashboardPdfData
}) {
  const donutRef = useRef<HTMLDivElement | null>(null)
  const heatmapRef = useRef<HTMLDivElement | null>(null)

  // expose capture refs on the container via dataset hack-free approach: stash
  // on the container element so the generator can find them.
  // We attach refs to the container element using a custom property.
  const setContainerRefs = (el: HTMLDivElement | null) => {
    containerRef.current = el
    if (el) {
      ;(el as unknown as { __donutRef?: HTMLDivElement | null }).__donutRef = donutRef.current
      ;(el as unknown as { __heatmapRef?: HTMLDivElement | null }).__heatmapRef = heatmapRef.current
    }
  }

  const { transactions } = data

  // ---- donut data ----
  const byCat: Record<string, { name: string; value: number; color: string }> = {}
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const name = t.expand?.category_id?.name || 'Sem categoria'
    const color = t.expand?.category_id?.color || '#999999'
    if (!byCat[name]) byCat[name] = { name, value: 0, color }
    byCat[name].value += t.amount
  }
  const catList = Object.values(byCat).sort((a, b) => b.value - a.value)
  const top5 = catList.slice(0, 5)
  const otherTotal = catList.slice(5).reduce((s, c) => s + c.value, 0)
  const pieData = [
    ...top5,
    ...(otherTotal > 0 ? [{ name: 'Outros', value: otherTotal, color: '#CBD5E1' }] : []),
  ]

  // ---- heatmap data ----
  const agg = aggregateEmotions(transactions)
  const hasHeatmap = agg.emotionTxCount >= 5

  return (
    <div
      ref={setContainerRefs}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-10000px',
        top: 0,
        width: 460,
        pointerEvents: 'none',
        opacity: 0,
      }}
    >
      {pieData.length > 0 && (
        <div
          ref={donutRef}
          style={{
            width: 460,
            background: '#ffffff',
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontFamily: 'Helvetica, Arial, sans-serif',
            }}
          >
            <PieChart width={180} height={180}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={45}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
            </PieChart>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pieData.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    color: '#1F2937',
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: c.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatBRL(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasHeatmap && (
        <div
          ref={heatmapRef}
          style={{
            width: 460,
            background: '#ffffff',
            padding: 16,
            boxSizing: 'border-box',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>
            GASTO POR EMOÇÃO × DIA DA SEMANA
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '90px repeat(7, 1fr)',
              gap: 4,
            }}
          >
            <div />
            {WEEKDAYS_SHORT.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#9CA3AF',
                }}
              >
                {d}
              </div>
            ))}
            {EMOTIONS.map((meta) => {
              const cells = agg.byEmotion.get(meta.value)!
              return (
                <div key={meta.value} style={{ display: 'contents' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: '#374151',
                    }}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </div>
                  {cells.perWeekday.map((v, i) => {
                    const intensity = agg.maxCell > 0 && v > 0 ? 0.18 + 0.82 * (v / agg.maxCell) : 0
                    const bg =
                      v > 0
                        ? `rgba(${meta.rgb[0]}, ${meta.rgb[1]}, ${meta.rgb[2]}, ${intensity.toFixed(3)})`
                        : '#F3F4F6'
                    const label =
                      v > 0
                        ? v >= 1000
                          ? `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`
                          : `R$ ${Math.round(v).toLocaleString('pt-BR')}`
                        : '—'
                    return (
                      <div
                        key={i}
                        style={{
                          height: 34,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 600,
                          color: v > 0 ? '#1F2937' : '#D1D5DB',
                          backgroundColor: bg,
                        }}
                      >
                        {label}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#9CA3AF',
                alignSelf: 'center',
              }}
            >
              Total
            </div>
            {agg.weekdayTotals.map((v, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#374151',
                }}
              >
                {v > 0
                  ? v >= 1000
                    ? `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`
                    : `R$ ${Math.round(v).toLocaleString('pt-BR')}`
                  : '—'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

async function captureElement(
  el: HTMLElement | null | undefined,
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!el) return null
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })
    return {
      dataUrl: canvas.toDataURL('image/png'),
      w: canvas.width,
      h: canvas.height,
    }
  } catch {
    return null
  }
}

/**
 * Generates a 2-page A4 PDF report from the dashboard data.
 *
 * Page 1 — Resumo: header, 3 summary cards, income commitment %,
 * donut chart (captured via html2canvas) + category list.
 *
 * Page 2 — Padrões Emocionais e Membros: spending by emotion, heatmap,
 * automatic insights, per-member breakdown table, future commitment.
 *
 * @returns true if generation succeeded (file downloaded), false on error.
 */
export async function generateDashboardPdf(
  data: DashboardPdfData,
  captureContainer: HTMLDivElement | null,
): Promise<boolean> {
  const { familyName, month, year, transactions, members, memberSummaries, futureInstallments } =
    data

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  pdf.setFont('helvetica')

  let y = MARGIN

  // ---- capture donut + heatmap off-screen ----
  const containerEl = captureContainer
  const donutEl = (containerEl as unknown as { __donutRef?: HTMLDivElement | null } | null)
    ?.__donutRef
  const heatmapEl = (containerEl as unknown as { __heatmapRef?: HTMLDivElement | null } | null)
    ?.__heatmapRef
  const donutImg = await captureElement(donutEl)
  const heatmapImg = await captureElement(heatmapEl)

  // ============ PAGE 1 — RESUMO ============
  const drawFooter = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    pdf.setFontSize(8)
    pdf.setTextColor(COLORS.muted)
    pdf.text(`Gerado por Família Finance — ${dateStr}`, MARGIN, PAGE_H - 8)
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 15) {
      drawFooter()
      pdf.addPage()
      y = MARGIN
    }
  }

  // Header band
  pdf.setFillColor(COLORS.headerBg)
  pdf.rect(MARGIN, y, CONTENT_W, 22, 'F')
  pdf.setTextColor('#FFFFFF')
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text(truncate(familyName || 'Família', 40), MARGIN + 5, y + 9)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Relatório Financeiro', MARGIN + 5, y + 16)
  pdf.setFontSize(10)
  pdf.text(`${getMonthName(month)} ${year}`, PAGE_W - MARGIN - 5, y + 11, { align: 'right' })
  y += 22 + 8

  // Empty transactions case
  if (transactions.length === 0) {
    pdf.setTextColor(COLORS.muted)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Nenhuma transação registrada neste mês.', MARGIN, y + 10)
    y += 20
    drawFooter()
    pdf.save(`${sanitizeFileName(familyName)}_${getMonthName(month)}_${year}.pdf`)
    return true
  }

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses
  const commitment = income > 0 ? Math.min((expenses / income) * 100, 100) : 0

  // 3 summary cards
  const cardW = (CONTENT_W - 8) / 3
  const cardH = 22
  const drawCard = (x: number, label: string, value: string, bgHex: string, textHex: string) => {
    const [br, bg, bb] = hexToRgb(bgHex)
    pdf.setFillColor(br, bg, bb)
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'F')
    pdf.setTextColor(textHex)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.text(label.toUpperCase(), x + 4, y + 7)
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.text(value, x + 4, y + 16)
  }
  drawCard(MARGIN, 'Receitas', formatBRL(income), COLORS.incomeBg, COLORS.income)
  drawCard(MARGIN + cardW + 4, 'Despesas', formatBRL(expenses), COLORS.expenseBg, COLORS.expense)
  drawCard(
    MARGIN + (cardW + 4) * 2,
    'Saldo',
    formatBRL(balance),
    COLORS.balanceBg,
    balance >= 0 ? COLORS.balancePos : COLORS.balanceNeg,
  )
  y += cardH + 8

  // Comprometimento de Renda
  pdf.setTextColor(COLORS.text)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Comprometimento de Renda', MARGIN, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(COLORS.muted)
  const commColor = commitment > 80 ? COLORS.expense : commitment > 50 ? '#EAB308' : COLORS.income
  pdf.setTextColor(commColor)
  pdf.text(`${commitment.toFixed(1)}%`, MARGIN + 55, y)
  // progress bar
  pdf.setFillColor('#E5E7EB')
  pdf.roundedRect(MARGIN, y + 3, CONTENT_W, 4, 2, 2, 'F')
  const fillW = Math.min((commitment / 100) * CONTENT_W, CONTENT_W)
  const [cr, cg, cb] = hexToRgb(commColor)
  pdf.setFillColor(cr, cg, cb)
  pdf.roundedRect(MARGIN, y + 3, fillW, 4, 2, 2, 'F')
  y += 14

  // Section title: Despesas por Categoria
  ensureSpace(12)
  pdf.setFillColor(COLORS.sectionBg)
  pdf.rect(MARGIN, y, CONTENT_W, 8, 'F')
  pdf.setTextColor('#FFFFFF')
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Despesas por Categoria', MARGIN + 3, y + 5.5)
  y += 12

  // Donut image
  if (donutImg) {
    const maxW = CONTENT_W
    const ratio = donutImg.h / donutImg.w
    const imgW = Math.min(maxW, 110)
    const imgH = imgW * ratio
    ensureSpace(imgH + 4)
    try {
      pdf.addImage(donutImg.dataUrl, 'PNG', MARGIN, y, imgW, imgH)
    } catch {
      // skip image on failure
    }
    // category list beside the donut (if space allows)
    const listX = MARGIN + imgW + 6
    const listW = CONTENT_W - imgW - 6
    if (listW > 40) {
      const cats = Object.values(
        transactions
          .filter((t) => t.type === 'expense')
          .reduce<Record<string, { name: string; amount: number; color: string }>>((acc, t) => {
            const name = t.expand?.category_id?.name || 'Sem categoria'
            const color = t.expand?.category_id?.color || '#999999'
            if (!acc[name]) acc[name] = { name, amount: 0, color }
            acc[name].amount += t.amount
            return acc
          }, {}),
      ).sort((a, b) => b.amount - a.amount)

      let ly = y + 2
      pdf.setFontSize(9)
      for (const c of cats.slice(0, 8)) {
        if (ly + 6 > PAGE_H - 15) break
        const [r, g, b] = hexToRgb(c.color)
        pdf.setFillColor(r, g, b)
        pdf.circle(listX + 1.5, ly - 1, 1.2, 'F')
        pdf.setTextColor(COLORS.text)
        pdf.setFont('helvetica', 'normal')
        pdf.text(truncate(c.name, 22), listX + 5, ly)
        pdf.setFont('helvetica', 'bold')
        pdf.text(formatBRL(c.amount), listX + listW, ly, { align: 'right' })
        ly += 6
      }
    }
    y += Math.max(imgH, 10) + 6
  } else {
    // Fallback: only category list, full width
    const cats = Object.values(
      transactions
        .filter((t) => t.type === 'expense')
        .reduce<Record<string, { name: string; amount: number }>>((acc, t) => {
          const name = t.expand?.category_id?.name || 'Sem categoria'
          if (!acc[name]) acc[name] = { name, amount: 0 }
          acc[name].amount += t.amount
          return acc
        }, {}),
    ).sort((a, b) => b.amount - a.amount)

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    for (const c of cats.slice(0, 10)) {
      ensureSpace(6)
      pdf.setTextColor(COLORS.text)
      pdf.text(truncate(c.name, 40), MARGIN, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formatBRL(c.amount), PAGE_W - MARGIN, y, { align: 'right' })
      pdf.setFont('helvetica', 'normal')
      y += 6
    }
    y += 4
  }

  drawFooter()

  // ============ PAGE 2 — PADRÕES EMOCIONAIS E MEMBROS ============
  pdf.addPage()
  y = MARGIN

  const agg = aggregateEmotions(transactions)

  // Section: Padrões Emocionais de Gasto
  pdf.setFillColor(COLORS.sectionBg)
  pdf.rect(MARGIN, y, CONTENT_W, 8, 'F')
  pdf.setTextColor('#FFFFFF')
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Padrões Emocionais de Gasto', MARGIN + 3, y + 5.5)
  y += 12

  if (agg.emotionTxCount === 0) {
    pdf.setTextColor(COLORS.muted)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Nenhuma emoção registrada nas transações deste mês.', MARGIN, y + 4)
    y += 12
  } else {
    // Emotion totals with emoji + bar
    pdf.setFontSize(9)
    const maxEmotion = Math.max(1, ...EMOTIONS.map((e) => agg.byEmotion.get(e.value)!.total))
    for (const meta of EMOTIONS) {
      const total = agg.byEmotion.get(meta.value)!.total
      ensureSpace(7)
      // emoji (drawn as text — jsPDF default Helvetica can render these in most viewers)
      pdf.setTextColor(COLORS.text)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${meta.emoji} ${meta.label}`, MARGIN, y)
      // bar
      const barX = MARGIN + 60
      const barMaxW = 70
      pdf.setFillColor('#E5E7EB')
      pdf.roundedRect(barX, y - 3.5, barMaxW, 4, 1, 1, 'F')
      const fillW = (total / maxEmotion) * barMaxW
      const [r, g, b] = meta.rgb
      pdf.setFillColor(r, g, b)
      pdf.roundedRect(barX, y - 3.5, fillW, 4, 1, 1, 'F')
      // value
      pdf.setFont('helvetica', 'bold')
      pdf.text(formatBRL(total), PAGE_W - MARGIN, y, { align: 'right' })
      y += 7
    }
    y += 4

    // Heatmap image
    if (heatmapImg) {
      ensureSpace(50)
      const maxW = CONTENT_W
      const ratio = heatmapImg.h / heatmapImg.w
      const imgW = Math.min(maxW, 170)
      const imgH = imgW * ratio
      ensureSpace(imgH + 4)
      try {
        pdf.addImage(heatmapImg.dataUrl, 'PNG', MARGIN, y, imgW, imgH)
      } catch {
        // skip
      }
      y += imgH + 6
    }

    // Insights
    const insights = buildEmotionInsights(agg)
    if (insights.length > 0) {
      ensureSpace(8 + insights.length * 6)
      pdf.setTextColor(COLORS.primary)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Insights automáticos', MARGIN, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(COLORS.text)
      for (const ins of insights) {
        const lines = pdf.splitTextToSize(`• ${ins}`, CONTENT_W - 4)
        for (const line of lines) {
          ensureSpace(5)
          pdf.text(line, MARGIN + 2, y)
          y += 5
        }
      }
      y += 4
    }
  }

  // Section: Visão por Membro
  ensureSpace(12)
  pdf.setFillColor(COLORS.sectionBg)
  pdf.rect(MARGIN, y, CONTENT_W, 8, 'F')
  pdf.setTextColor('#FFFFFF')
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Visão por Membro', MARGIN + 3, y + 5.5)
  y += 12

  // Table header
  const colName = MARGIN
  const colRec = MARGIN + 95
  const colDesp = MARGIN + 130
  const colSaldo = PAGE_W - MARGIN
  pdf.setFillColor('#F9FAFB')
  pdf.rect(MARGIN, y - 4, CONTENT_W, 7, 'F')
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(COLORS.muted)
  pdf.text('MEMBRO', colName, y)
  pdf.text('RECEITAS', colRec, y)
  pdf.text('DESPESAS', colDesp, y)
  pdf.text('SALDO', colSaldo, y, { align: 'right' })
  y += 6

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  for (const m of members) {
    ensureSpace(6)
    const ms = memberSummaries[m.id]
    const rec = ms?.totalReceitas || 0
    const desp = ms?.totalDespesas || 0
    const sal = ms?.saldo ?? rec - desp
    pdf.setTextColor(COLORS.text)
    pdf.text(truncate(shortMemberName(m.display_name), 30), colName, y)
    pdf.setTextColor(COLORS.income)
    pdf.text(formatBRL(rec), colRec, y)
    pdf.setTextColor(COLORS.expense)
    pdf.text(formatBRL(desp), colDesp, y)
    pdf.setTextColor(sal >= 0 ? COLORS.balancePos : COLORS.balanceNeg)
    pdf.setFont('helvetica', 'bold')
    pdf.text(formatBRL(sal), colSaldo, y, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    y += 6
    pdf.setDrawColor(COLORS.border)
    pdf.setLineWidth(0.1)
    pdf.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2)
  }
  y += 6

  // Section: Comprometimento Futuro
  if (futureInstallments.length > 0) {
    ensureSpace(12)
    pdf.setFillColor(COLORS.sectionBg)
    pdf.rect(MARGIN, y, CONTENT_W, 8, 'F')
    pdf.setTextColor('#FFFFFF')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Comprometimento Futuro', MARGIN + 3, y + 5.5)
    y += 12

    const total = futureInstallments.reduce((s, t) => s + t.amount, 0)
    pdf.setTextColor(COLORS.text)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Total futuro em parcelas:', MARGIN, y)
    pdf.setTextColor('#B45309')
    pdf.text(formatBRL(total), MARGIN + 55, y)
    pdf.setTextColor(COLORS.muted)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(`(${futureInstallments.length} parcelas)`, MARGIN + 95, y)
    y += 6

    // monthly breakdown
    const monthlyMap: Record<string, { total: number; count: number }> = {}
    for (const tx of futureInstallments) {
      const key = tx.transaction_date.substring(0, 7)
      if (!monthlyMap[key]) monthlyMap[key] = { total: 0, count: 0 }
      monthlyMap[key].total += tx.amount
      monthlyMap[key].count += 1
    }
    const months = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b))
    pdf.setFontSize(9)
    for (const [key, data] of months) {
      ensureSpace(6)
      const [yr, mo] = key.split('-')
      pdf.setTextColor(COLORS.text)
      pdf.text(`${getMonthName(parseInt(mo, 10) - 1)} ${yr}`, MARGIN, y)
      pdf.setTextColor(COLORS.muted)
      pdf.text(
        `${formatBRL(data.total)} (${data.count} ${data.count === 1 ? 'parcela' : 'parcelas'})`,
        PAGE_W - MARGIN,
        y,
        { align: 'right' },
      )
      y += 6
    }
  }

  drawFooter()

  const fileName = `${sanitizeFileName(familyName)}_${getMonthName(month)}_${year}.pdf`
  pdf.save(fileName)
  return true
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

// keep rgbToHex import-used (helper, not currently used externally)
export { rgbToHex, EMOTION_HEX, shortMemberName }

/**
 * Convenience hook: returns a stable callback that generates the PDF given the
 * capture container ref. Usage:
 *   const containerRef = useRef<HTMLDivElement>(null)
 *   const generatePdf = useGeneratePdf(containerRef)
 *   <PdfCaptureTargets containerRef={containerRef} data={...} />
 *   generatePdf(data)
 */
export function useGeneratePdf(
  containerRef: React.RefObject<HTMLDivElement | null>,
): (data: DashboardPdfData) => Promise<boolean> {
  return useCallback(
    (data: DashboardPdfData) => generateDashboardPdf(data, containerRef.current),
    [containerRef],
  )
}
