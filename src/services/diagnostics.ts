import pb from '@/lib/pocketbase/client'
import type { InvoiceRecord } from '@/types/finance'

export interface DiagnosticResult {
  status: number
  statusText: string
  body: unknown
  rawText: string
  durationMs: number
}

export async function runParseInvoiceDiagnostic(invoiceId: string): Promise<DiagnosticResult> {
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL
  const startTime = Date.now()

  const res = await fetch(`${baseUrl}/backend/v1/parse-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token || '',
    },
    body: JSON.stringify({ invoice_id: invoiceId }),
  })

  const durationMs = Date.now() - startTime
  const text = await res.text()

  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // Keep raw text if not JSON
  }

  return { status: res.status, statusText: res.statusText, body, rawText: text, durationMs }
}

export async function getInvoicesWithFiles(familyId: string): Promise<InvoiceRecord[]> {
  return pb.collection('invoices').getFullList<InvoiceRecord>({
    filter: `family_id = "${familyId}" && raw_file_url != ""`,
    sort: '-created',
    expand: 'card_id',
  })
}

export async function getFamilyIdForUser(userId: string): Promise<string | null> {
  try {
    const member = await pb.collection('members').getFirstListItem(`user_id = "${userId}"`)
    return member.family_id
  } catch {
    return null
  }
}
