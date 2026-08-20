import pb from '@/lib/pocketbase/client'
import type { InvoiceItemRecord } from '@/types/finance'

import { fixMojibake } from '@/lib/utils'

export const getInvoiceItemsByInvoiceId = async (invoiceId: string) => {
  const list = await pb.collection('invoice_items').getFullList<InvoiceItemRecord>({
    filter: `invoice_id = "${invoiceId}"`,
    sort: 'created',
    expand: 'suggested_category_id,confirmed_category_id',
  })
  return list.map((item) => ({
    ...item,
    description: fixMojibake(item.description),
  }))
}

export const updateInvoiceItem = (id: string, data: Partial<InvoiceItemRecord>) =>
  pb.collection('invoice_items').update<InvoiceItemRecord>(id, data)

export const deleteInvoiceItem = (id: string) => pb.collection('invoice_items').delete(id)

export const excludeInvoiceItem = (id: string) =>
  pb.collection('invoice_items').update<InvoiceItemRecord>(id, { excluded: true })
