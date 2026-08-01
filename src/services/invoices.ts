import pb from '@/lib/pocketbase/client'
import type { InvoiceRecord } from '@/types/finance'

export const getInvoicesByCardId = (cardId: string) =>
  pb.collection('invoices').getFullList<InvoiceRecord>({
    filter: `card_id = "${cardId}"`,
    sort: '-month_ref',
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

export const parseInvoice = (invoiceId: string) => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 60000)
  })
  const requestPromise = pb.send('/backend/v1/parse-invoice', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId }),
    headers: { 'Content-Type': 'application/json' },
  })
  return Promise.race([requestPromise, timeoutPromise])
}

export const convertInvoiceItems = (invoiceId: string, itemIds: string[]) =>
  pb.send('/backend/v1/convert-invoice-items', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId, invoice_item_ids: itemIds }),
    headers: { 'Content-Type': 'application/json' },
  })

export const getPendingInvoicesCount = (familyId: string) =>
  pb
    .collection('invoices')
    .getList(1, 1, {
      filter: `family_id = "${familyId}" && status = "pending" && parsed_at != null`,
    })
    .then((r) => r.totalItems)
