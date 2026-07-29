/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add any other utility functions here

export function formatBRL(val: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function getMonthName(monthIndex: number): string {
  return MONTHS_PT[monthIndex] || ''
}

export function formatDatePtBR(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`
}

export function getProgressBarColor(ratio: number): string {
  if (ratio <= 50) return 'bg-[#22C55E]'
  if (ratio <= 80) return 'bg-[#EAB308]'
  return 'bg-[#EF4444]'
}
