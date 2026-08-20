import pb from '@/lib/pocketbase/client'
import type { InvoiceRecord } from '@/types/finance'

export const getInvoicesByCardId = (cardId: string) =>
  pb.collection('invoices').getFullList<InvoiceRecord>({
    filter: `card_id = "${cardId}"`,
    sort: '-month_ref',
    expand: 'card_id',
  })

export const getInvoicesByFamilyId = (familyId: string) =>
  pb.collection('invoices').getFullList<InvoiceRecord>({
    filter: `family_id = "${familyId}"`,
    sort: '-month_ref',
    expand: 'card_id',
  })

export const getInvoice = (id: string) =>
  pb.collection('invoices').getOne<InvoiceRecord>(id, { expand: 'card_id' })

interface InvoiceCreateData {
  card_id: string
  family_id: string
  owner_id: string
  month_ref: string
  total_amount: number
  status: string
  raw_file_url?: File
}

export const createInvoice = (data: InvoiceCreateData) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    if (value instanceof File) formData.append(key, value)
    else formData.append(key, String(value))
  }
  return pb.collection('invoices').create<InvoiceRecord>(formData)
}

export const updateInvoice = (id: string, data: Partial<InvoiceRecord>) =>
  pb.collection('invoices').update<InvoiceRecord>(id, data)

export const deleteInvoice = (id: string) => pb.collection('invoices').delete(id)

export const deleteInvoiceCascade = (invoiceId: string) =>
  pb.send<{
    success: boolean
    deleted: { transactions: number; invoice_items: number }
    skipped: number
    errors: Array<{ item_id?: string; transaction_id?: string; error: string }>
  }>('/backend/v1/delete-invoice', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId }),
    headers: { 'Content-Type': 'application/json' },
  })

export const parseInvoice = (invoiceId: string) => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 200000)
  })
  const requestPromise = pb.send('/backend/v1/parse-invoice', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId }),
    headers: { 'Content-Type': 'application/json' },
  })
  return Promise.race([requestPromise, timeoutPromise])
}

interface ConvertResult {
  success: boolean
  count: number
  failed?: number
  errors?: Array<{ item_id: string; description?: string; error: string }>
}

export const convertInvoiceItems = (
  invoiceId: string,
  itemIds: string[],
  emotions?: Record<string, string | null>,
) => {
  const body: Record<string, unknown> = {
    invoice_id: invoiceId,
    invoice_item_ids: itemIds,
  }
  if (emotions) body.item_emotions = emotions
  return pb.send<ConvertResult>('/backend/v1/convert-invoice-items', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getPendingInvoicesCount = (familyId: string) =>
  pb
    .collection('invoices')
    .getList(1, 1, {
      filter: `family_id = "${familyId}" && (status = "pending" || status = "parsed") && parsed_at != null`,
    })
    .then((r) => r.totalItems)

export interface AiCategorizeResult {
  success: boolean
  categorized_by_rules: number
  categorized_by_ai: number
  no_match: number
  ai_error: string | null
  step: string | null
  unmatched_samples?: string[]
}

export const aiCategorizeInvoiceItems = (invoiceId: string) =>
  pb.send<AiCategorizeResult>('/backend/v1/ai-categorize-invoice-items', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId }),
    headers: { 'Content-Type': 'application/json' },
  })
