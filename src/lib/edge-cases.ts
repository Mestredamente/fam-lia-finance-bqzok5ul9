import type { TransactionRecord, MemberRecord, InvestmentRecord } from '@/types/finance'

export function safeCategoryName(tx: TransactionRecord): string {
  const cat = tx.expand?.category_id
  if (!cat) return 'Categoria removida'
  return cat.name || 'Categoria removida'
}

export function safeMemberName(member: MemberRecord | undefined | null): string {
  if (!member) return 'Membro removido'
  if (!member.is_active) return 'Membro removido'
  return member.display_name || 'Membro removido'
}

export function safeIncome(income: number | null | undefined): number {
  if (typeof income !== 'number' || isNaN(income)) return 0
  return income
}

export function safeInvestmentValue(inv: InvestmentRecord): number {
  if (typeof inv.current_value === 'number' && !isNaN(inv.current_value)) return inv.current_value
  return inv.amount_invested || 0
}

export function adjustDueDay(day: number, year: number, month: number): number {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.min(day || 1, lastDay)
}

export function toBrazilDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function toBrazilDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export function isFutureDate(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return d > now
}
