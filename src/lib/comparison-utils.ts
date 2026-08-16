/**
 * Variação de um indicador entre o mês atual e o mês anterior.
 * - direction 'up'   => valor subiu
 * - direction 'down' => valor caiu
 * - direction 'stable' => variação insignificante (|percent| < 5)
 * - isNew => categoria/métrica nova (mês anterior zerado mas atual > 0)
 */
export interface Variation {
  percent: number
  direction: 'up' | 'down' | 'stable'
  isNew: boolean
}

/**
 * Calcula a variação percentual entre dois valores, tratando os edge cases
 * de divisão por zero (mês anterior zerado, ambos zerados, etc.).
 */
export function getVariation(current: number, previous: number): Variation {
  // Categoria/métrica nova: não existia no mês anterior mas aparece agora.
  if (previous === 0 && current > 0) {
    return { percent: 0, direction: 'up', isNew: true }
  }
  // Ambos zerados => estável sem variação.
  if (previous === 0 && current === 0) {
    return { percent: 0, direction: 'stable', isNew: false }
  }
  // Existia e sumiu completamente => redução total (100%).
  if (previous > 0 && current === 0) {
    return { percent: 100, direction: 'down', isNew: false }
  }
  // Caso normal.
  const percent = Math.round(Math.abs((current - previous) / previous) * 100)
  let direction: 'up' | 'down' | 'stable'
  if (percent < 5) {
    direction = 'stable'
  } else if (current > previous) {
    direction = 'up'
  } else {
    direction = 'down'
  }
  return { percent, direction, isNew: false }
}

/**
 * Classe de cor Tailwind (com variantes dark) para o indicador, considerando
 * o contexto: para receitas e saldo "up" é bom (verde); para despesas "up" é
 * ruim (vermelho, gastou mais).
 */
export function getVariationColor(
  direction: string,
  context: 'income' | 'expense' | 'balance',
): string {
  if (direction === 'stable') {
    return 'text-gray-400 dark:text-gray-500'
  }
  const isGood =
    direction === 'up' ? context === 'income' || context === 'balance' : context === 'expense'
  return isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
}

/**
 * Texto curto do indicador: "↗ 12%", "↘ 8%", "→" ou "Nova".
 */
export function formatVariation(variation: Variation): string {
  if (variation.isNew) return 'Nova'
  switch (variation.direction) {
    case 'up':
      return `↗ ${variation.percent}%`
    case 'down':
      return `↘ ${variation.percent}%`
    default:
      return '→'
  }
}

/**
 * Tooltip completo: valor do mês anterior + diferença em reais.
 * Ex: "Mês anterior: R$ 1.000,00 · +R$ 200,00"
 */
export function buildVariationTooltip(
  previous: number,
  current: number,
  format: (v: number) => string,
): string {
  const diff = current - previous
  const sign = diff >= 0 ? '+' : '-'
  return `Mês anterior: ${format(previous)} · ${sign}${format(Math.abs(diff))}`
}
