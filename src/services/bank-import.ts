import pb from '@/lib/pocketbase/client'

export interface ParsedTransaction {
  description: string
  amount: number
  transaction_date: string
  type: 'expense' | 'income'
  suggested_category_id: string | null
  suggested_category_name: string | null
}

export interface ImportResult {
  transactions: ParsedTransaction[]
  categories: Array<{ id: string; name: string; type: string }>
}

export const importBankStatement = async (file: File, familyId: string): Promise<ImportResult> => {
  const content = await file.text()
  return pb.send('/backend/v1/import-statement', {
    method: 'POST',
    body: JSON.stringify({ content, filename: file.name, family_id: familyId }),
    headers: { 'Content-Type': 'application/json' },
  })
}
