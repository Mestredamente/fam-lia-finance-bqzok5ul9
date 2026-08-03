import type { InvoiceRecord } from '@/types/finance'

export type ParseStatus = 'processing' | 'success' | 'error' | 'none'

export function getParseStatus(invoice: InvoiceRecord): ParseStatus {
  const status = invoice.status
  const reviewedAt = invoice.reviewed_at

  let result: ParseStatus

  if (status === 'reviewed' || status === 'paid' || reviewedAt) {
    result = 'none'
  } else if (status === 'parsed' && invoice.parsed_at) {
    result = 'success'
  } else {
    result = 'none'
  }

  console.log(`getParseStatus: status=${status} reviewed_at=${reviewedAt || ''} result=${result}`)

  return result
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
