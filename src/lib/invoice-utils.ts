import type { InvoiceRecord } from '@/types/finance'

export type ParseStatus = 'processing' | 'success' | 'error' | 'none'

export function getParseStatus(invoice: InvoiceRecord): ParseStatus {
  if (!invoice.raw_file_url) return 'none'
  if (!invoice.parsed_at) return 'processing'
  try {
    const data = invoice.parsed_data ? JSON.parse(invoice.parsed_data) : null
    if (data && typeof data === 'object' && 'error' in data) return 'error'
  } catch {
    // parsed_data is not valid JSON — assume success
  }
  return 'success'
}
