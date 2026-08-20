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

/**
 * Corrige mojibake comum decorrente de dupla decodificação UTF-8 (ex: "TransaÃ§Ã£o" -> "Transação").
 */
export function fixMojibake(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return str || ''
  let result = str
  if (
    /Ã[§£©ãÃáéíóúâêîôûàèìòùäëïöüãõñçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÃÕÑÇ\x80-\xbf]/.test(result) ||
    /[\u00c0-\u00c3][\u0080-\u00bf]/.test(result)
  ) {
    try {
      const fixed = decodeURIComponent(escape(result))
      if (fixed && fixed !== result) {
        result = fixed
      }
    } catch {
      /* intentionally ignored */
    }
  }

  // Substituições diretas como garantia caso escape/decodeURIComponent falhe
  if (result.includes('Ã')) {
    result = result
      .replace(/Ã§/g, 'ç')
      .replace(/Ã£/g, 'ã')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ãª/g, 'ê')
      .replace(/Ã´/g, 'ô')
      .replace(/Ãµ/g, 'õ')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ã€/g, 'À')
      .replace(/Ã/g, 'Á')
      .replace(/Ã‚/g, 'Â')
      .replace(/Ãƒ/g, 'Ã')
      .replace(/Ã‰/g, 'É')
      .replace(/ÃŠ/g, 'Ê')
      .replace(/Ã/g, 'Í')
      .replace(/Ã“/g, 'Ó')
      .replace(/Ã”/g, 'Ô')
      .replace(/Ã•/g, 'Õ')
      .replace(/Ãš/g, 'Ú')
      .replace(/Ã‡/g, 'Ç')
  }

  return result
}
