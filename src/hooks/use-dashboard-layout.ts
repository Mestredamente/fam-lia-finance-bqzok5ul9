import { useCallback, useEffect, useState } from 'react'

export interface DashboardCardConfig {
  id: DashboardCardId
  visible: boolean
  order: number
}

export type DashboardCardId =
  | 'summary'
  | 'expensesByCategory'
  | 'memberView'
  | 'futureCommitment'
  | 'fixedBills'
  | 'patrimony'
  | 'subscriptions'
  | 'aiInsights'
  | 'upcomingTasks'
  | 'emotionalSpending'

const STORAGE_KEY = 'dashboard_layout'

export const DEFAULT_CARD_ORDER: DashboardCardId[] = [
  'summary',
  'expensesByCategory',
  'memberView',
  'futureCommitment',
  'fixedBills',
  'patrimony',
  'subscriptions',
  'aiInsights',
  'upcomingTasks',
  'emotionalSpending',
]

export const CARD_TITLES: Record<DashboardCardId, string> = {
  summary: 'Resumo Financeiro',
  expensesByCategory: 'Despesas por Categoria',
  memberView: 'Visão por Membro',
  futureCommitment: 'Comprometimento Futuro',
  fixedBills: 'Contas Fixas',
  patrimony: 'Patrimônio',
  subscriptions: 'Assinaturas',
  aiInsights: 'Insights IA',
  upcomingTasks: 'Próximos Compromissos',
  emotionalSpending: 'Padrões Emocionais de Gasto',
}

/** Cards that cannot be hidden. */
export const NON_HIDEABLE: ReadonlySet<DashboardCardId> = new Set(['summary'])

function buildDefault(): DashboardCardConfig[] {
  return DEFAULT_CARD_ORDER.map((id, i) => ({ id, visible: true, order: i }))
}

/**
 * Reads persisted dashboard layout from localStorage. Falls back to the default
 * order when nothing is stored (or the stored payload is invalid/incomplete).
 */
function loadFromStorage(): DashboardCardConfig[] {
  if (typeof window === 'undefined') return buildDefault()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefault()
    const parsed = JSON.parse(raw) as { cards?: DashboardCardConfig[] }
    if (!parsed || !Array.isArray(parsed.cards)) return buildDefault()

    // Reconcile against defaults: keep known cards, append any missing ones,
    // and drop unknown ids so the layout always reflects the current app.
    const stored = parsed.cards.filter(
      (c) => c && typeof c.id === 'string' && DEFAULT_CARD_ORDER.includes(c.id),
    )
    const seen = new Set(stored.map((c) => c.id))
    for (const id of DEFAULT_CARD_ORDER) {
      if (!seen.has(id)) stored.push({ id, visible: true, order: stored.length })
    }
    // Force non-hideable cards visible.
    for (const c of stored) {
      if (NON_HIDEABLE.has(c.id)) c.visible = true
    }
    // Sort by persisted order then normalize.
    stored.sort((a, b) => a.order - b.order)
    return stored.map((c, i) => ({ ...c, order: i }))
  } catch {
    return buildDefault()
  }
}

export function useDashboardLayout() {
  const [cards, setCards] = useState<DashboardCardConfig[]>(() => loadFromStorage())

  // Persist whenever layout changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards }))
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [cards])

  const toggleVisible = useCallback((id: DashboardCardId) => {
    if (NON_HIDEABLE.has(id)) return
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)))
  }, [])

  const moveCard = useCallback((id: DashboardCardId, direction: 'up' | 'down') => {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      if (idx === -1) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      next.splice(target, 0, moved)
      return next.map((c, i) => ({ ...c, order: i }))
    })
  }, [])

  const resetLayout = useCallback(() => setCards(buildDefault()), [])

  return { cards, toggleVisible, moveCard, resetLayout }
}
