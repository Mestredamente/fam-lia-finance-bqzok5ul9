import pb from '@/lib/pocketbase/client'

export interface DDCParsedData {
  financed_amount: number | null
  installment_value: number | null
  installments_total: number | null
  installments_paid: number
  interest_rate: number | null
  cet: number | null
  amortization_system: 'PRICE' | 'SAC' | 'Livre' | null
  due_day: number | null
  first_due_date: string | null
  balance_due: number | null
  bank_name: string | null
}

export interface DDCParseResult {
  success: boolean
  data?: DDCParsedData
  error?: string
}

export const parseDDC = (pdfBase64: string, familyId: string): Promise<DDCParseResult> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 200000)
  })
  const requestPromise = pb.send<DDCParseResult>('/backend/v1/parse-ddc', {
    method: 'POST',
    body: JSON.stringify({ pdf_base64: pdfBase64, family_id: familyId }),
    headers: { 'Content-Type': 'application/json' },
  })
  return Promise.race([requestPromise, timeoutPromise])
}
