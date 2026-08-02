export type PeriodType = 'hoje' | 'semana' | 'mes' | 'mes_passado' | 'ano' | 'tudo'

export interface PeriodRange {
  startDate: string | null
  endDate: string | null
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getPeriodRange(period: PeriodType, year?: number, month?: number): PeriodRange {
  const now = new Date()

  switch (period) {
    case 'hoje': {
      const today = formatDate(now)
      return { startDate: today, endDate: today }
    }
    case 'semana': {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { startDate: formatDate(start), endDate: formatDate(end) }
    }
    case 'mes': {
      const y = year ?? now.getFullYear()
      const m = month ?? now.getMonth()
      const start = new Date(y, m, 1)
      const end = new Date(y, m + 1, 0)
      return { startDate: formatDate(start), endDate: formatDate(end) }
    }
    case 'mes_passado': {
      const y = year ?? now.getFullYear()
      const m = (month ?? now.getMonth()) - 1
      const start = new Date(y, m, 1)
      const end = new Date(y, m + 1, 0)
      return { startDate: formatDate(start), endDate: formatDate(end) }
    }
    case 'ano': {
      const y = year ?? now.getFullYear()
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` }
    }
    case 'tudo':
      return { startDate: null, endDate: null }
  }
}

export const periodLabels: Record<PeriodType, string> = {
  hoje: 'hoje',
  semana: 'esta semana',
  mes: 'este mês',
  mes_passado: 'mês passado',
  ano: 'este ano',
  tudo: 'tudo',
}
