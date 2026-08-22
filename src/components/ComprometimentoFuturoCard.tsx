import { useMemo, useState } from 'react'
import { CalendarClock, ChevronRight, Layers, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useFutureInstallments, type FutureInstallment } from '@/hooks/use-future-installments'
import { usePrivacy } from '@/hooks/use-privacy'
import { getMonthName } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  familyId: string
  /** When true (edit mode), always render a skeleton placeholder even with no
   * installments so the user can still see/move the card. */
  forceRender?: boolean
}

/**
 * Card "Comprometimentos Futuros".
 *
 * Redesenho com drill-down progressivo para eliminar o scroll vertical
 * excessivo do layout antigo (mês a mês em lista longa):
 *
 *  1. Topo: total acumulado de todos os comprometimentos.
 *  2. Barras horizontais agrupadas por semestre (até 2 anos à frente).
 *  3. Clique num semestre → abre um drawer lateral com o detalhamento mês a
 *     mês desse semestre, com períodos de valor idêntico agrupados em uma
 *     única linha (ex.: "Ago–Dez 2027: R$ 236,83/mês (5 meses)").
 *
 * No mobile, a lista de semestres também funciona como carrossel horizontal
 * (snap-x) — sem scroll vertical longo.
 *
 * Observação de dados: a UI agrupa meses com valor idêntico para reduzir a
 * altura, mas isso NÃO corrige duplicação na origem. Para evitar soma
 * dupla de parcelas legítimas que porventura tenham sido geradas em
 * duplicata pelo hook de conversão de fatura, fazemos uma deduplicação
 * defensiva aqui (mesmo parent_transaction_id + installment_current +
 * mês + valor).
 */
export function ComprometimentoFuturoCard({ familyId, forceRender }: Props) {
  const { installments, loading } = useFutureInstallments(familyId)
  const { formatCurrency } = usePrivacy()
  const [openSemester, setOpenSemester] = useState<string | null>(null)

  // Deduplicação defensiva (client-side). Duas parcelas futuras do mesmo
  // compromisso (mesmo parent_transaction_id + installment_current) com o
  // mesmo valor e o mesmo mês são, por definição, duplicatas de um erro de
  // agregação — não parcelas legítimas. Mantemos apenas uma.
  const deduped = useMemo(() => {
    const seen = new Set<string>()
    const out: FutureInstallment[] = []
    for (const tx of installments) {
      const parent = tx.parent_transaction_id || tx.id
      const key = `${parent}|${tx.installment_current ?? 0}|${tx.transaction_date?.slice(0, 7)}|${tx.amount}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(tx)
    }
    return out
  }, [installments])

  const total = deduped.reduce((s, t) => s + t.amount, 0)

  const semesters = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    for (const tx of deduped) {
      const d = tx.transaction_date ? new Date(tx.transaction_date + 'T00:00:00') : null
      if (!d || isNaN(d.getTime())) continue
      const y = d.getFullYear()
      const half = d.getMonth() < 6 ? 1 : 2
      const key = `${y}-S${half}`
      if (!map[key]) map[key] = { total: 0, count: 0 }
      map[key].total += tx.amount
      map[key].count += 1
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [deduped])

  const maxSemesterTotal = semesters.length ? Math.max(...semesters.map(([, s]) => s.total)) : 0

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Comprometimento futuro</h2>
        <Skeleton className="h-28 rounded-2xl" />
      </section>
    )
  }

  if (deduped.length === 0 && !forceRender) return null

  if (deduped.length === 0) {
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
          {/* Topo: total acumulado */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">
                Comprometimento futuro em parcelas
              </span>
              <span className="text-2xl font-extrabold text-amber-700">
                {formatCurrency(total)}
              </span>
              <span className="text-xs text-gray-500 ml-2">({deduped.length} parcelas)</span>
            </div>
          </div>

          {/* Barras horizontais por semestre (carrossel no mobile) */}
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
            {semesters.map(([key, s]) => {
              const [yearStr, halfStr] = key.split('-S')
              const year = Number(yearStr)
              const half = Number(halfStr)
              const label = `${half === 1 ? '1º' : '2º'} Sem ${year}`
              const widthPct = maxSemesterTotal > 0 ? (s.total / maxSemesterTotal) * 100 : 0
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOpenSemester(key)}
                  className="snap-start shrink-0 w-40 text-left rounded-xl border border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-colors p-3 group"
                  aria-label={`Ver detalhamento de ${label}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-700">{label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-amber-600" />
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.max(widthPct, 4)}%` }}
                    />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-bold text-amber-700 tabular-nums">
                      {formatCurrency(s.total)}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {s.count} {s.count === 1 ? 'parcela' : 'parcelas'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Toque em um semestre para ver o detalhamento mês a mês.
          </p>
        </CardContent>
      </Card>

      {/* Drawer lateral com detalhamento do semestre */}
      <SemesterDetailSheet
        semesterKey={openSemester}
        installments={deduped}
        onClose={() => setOpenSemester(null)}
        formatCurrency={formatCurrency}
      />
    </section>
  )
}

/** Formata "2026-S1" → "1º Semestre 2026". */
function semesterLabel(key: string): string {
  const [yearStr, halfStr] = key.split('-S')
  const year = Number(yearStr)
  const half = Number(halfStr)
  return `${half === 1 ? '1º' : '2º'} Semestre ${year}`
}

interface GroupedMonth {
  /** chave YYYY-MM do primeiro mês do intervalo */
  startKey: string
  /** chave YYYY-MM do último mês do intervalo */
  endKey: string
  total: number
  monthlyAmount: number
  count: number
}

/**
 * Agrupa meses consecutivos com o MESMO valor mensal total em um único
 * intervalo (ex.: Ago–Dez 2027 com R$ 236,83/mês). Reduz a altura do
 * detalhamento de meses com parcelas idênticas.
 */
function groupIdenticalMonths(
  months: { key: string; total: number; count: number }[],
): GroupedMonth[] {
  if (months.length === 0) return []
  const out: GroupedMonth[] = []
  let cur: GroupedMonth | null = null
  for (const m of months) {
    if (cur && cur.monthlyAmount === m.total) {
      cur.endKey = m.key
      cur.total += m.total
      cur.count += m.count
    } else {
      if (cur) out.push(cur)
      cur = {
        startKey: m.key,
        endKey: m.key,
        total: m.total,
        monthlyAmount: m.total,
        count: m.count,
      }
    }
  }
  if (cur) out.push(cur)
  return out
}

function keyToLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${getMonthName(Number(m) - 1)} ${y}`
}

function SemesterDetailSheet({
  semesterKey,
  installments,
  onClose,
  formatCurrency,
}: {
  semesterKey: string | null
  installments: FutureInstallment[]
  onClose: () => void
  formatCurrency: (val: number | null | undefined) => string
}) {
  const months = useMemo(() => {
    if (!semesterKey) return []
    const [yearStr, halfStr] = semesterKey.split('-S')
    const year = Number(yearStr)
    const half = Number(halfStr)
    const monthStart = half === 1 ? 0 : 6
    const monthEnd = half === 1 ? 5 : 11

    const map: Record<string, { total: number; count: number }> = {}
    for (let mo = monthStart; mo <= monthEnd; mo++) {
      const mm = String(mo + 1).padStart(2, '0')
      map[`${year}-${mm}`] = { total: 0, count: 0 }
    }
    for (const tx of installments) {
      const d = tx.transaction_date ? new Date(tx.transaction_date + 'T00:00:00') : null
      if (!d || isNaN(d.getTime())) continue
      if (d.getFullYear() !== year) continue
      const mo = d.getMonth()
      if (mo < monthStart || mo > monthEnd) continue
      const mm = String(mo + 1).padStart(2, '0')
      const key = `${year}-${mm}`
      map[key].total += tx.amount
      map[key].count += 1
    }
    const entries = Object.entries(map)
      .filter(([, v]) => v.count > 0)
      .map(([key, v]) => ({ key, ...v }))
    return groupIdenticalMonths(entries)
  }, [semesterKey, installments])

  const semesterTotal = months.reduce((s, m) => s + m.total, 0)

  return (
    <Sheet open={!!semesterKey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <CalendarClock className="h-4 w-4" />
            </div>
            <SheetTitle className="text-left">
              {semesterKey ? semesterLabel(semesterKey) : ''}
            </SheetTitle>
          </div>
          <p className="text-sm text-gray-500 text-left mt-1">
            Total do semestre:{' '}
            <span className="font-bold text-amber-700">{formatCurrency(semesterTotal)}</span>
          </p>
        </SheetHeader>

        <div className="space-y-1.5 pr-2">
          {months.length === 0 && (
            <p className="text-sm text-gray-500 py-6 text-center">
              Nenhuma parcela neste semestre.
            </p>
          )}
          {months.map((g, i) => {
            const isRange = g.startKey !== g.endKey
            const monthsCount = monthRangeLength(g.startKey, g.endKey)
            return (
              <div
                key={`${g.startKey}-${g.endKey}-${i}`}
                className={cn(
                  'flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-gray-50',
                )}
              >
                <div className="min-w-0">
                  <span className="font-medium text-gray-700 block">
                    {isRange
                      ? `${keyToLabel(g.startKey)} – ${keyToLabel(g.endKey)}`
                      : keyToLabel(g.startKey)}
                  </span>
                  {isRange && (
                    <span className="text-[10px] text-gray-400">
                      {g.count} parcelas · {monthsCount} meses
                    </span>
                  )}
                  {!isRange && (
                    <span className="text-[10px] text-gray-400">
                      {g.count} {g.count === 1 ? 'parcela' : 'parcelas'}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {isRange ? (
                    <>
                      <span className="text-gray-600">{formatCurrency(g.monthlyAmount)}/mês</span>
                      <span className="block text-[10px] text-gray-400">
                        total {formatCurrency(g.total)}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-600">{formatCurrency(g.total)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-700 py-2"
        >
          <X className="h-3.5 w-3.5" />
          Fechar
        </button>
      </SheetContent>
    </Sheet>
  )
}

/** Número de meses entre duas chaves YYYY-MM (inclusive). */
function monthRangeLength(startKey: string, endKey: string): number {
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  return (ey - sy) * 12 + (em - sm) + 1
}
