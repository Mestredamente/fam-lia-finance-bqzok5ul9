import type { InvoiceRecord } from '@/types/finance'

export type ParseStatus = 'processing' | 'success' | 'error' | 'none'

export function getParseStatus(invoice: InvoiceRecord): ParseStatus {
  if (!invoice.raw_file_url) return 'none'
  if (!invoice.parsed_at) return 'processing'
  try {
    const data = invoice.parsed_data ? JSON.parse(invoice.parsed_data) : null
    if (data && typeof data === 'object' && ('error' in data || 'erro' in data)) return 'error'
  } catch {
    // parsed_data is not valid JSON — assume success
  }
  return 'success'
}

export function getParseError(invoice: InvoiceRecord): string | null {
  if (!invoice.parsed_data) return null
  try {
    const data = JSON.parse(invoice.parsed_data)
    if (data && typeof data === 'object') {
      if (typeof data.error === 'string') return data.error
      if (typeof data.erro === 'string') return data.erro
    }
  } catch {
    // parsed_data is not valid JSON
  }
  return null
}
