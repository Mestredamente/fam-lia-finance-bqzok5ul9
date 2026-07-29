import pb from '@/lib/pocketbase/client'
import type { TransactionRecord } from '@/types/finance'

export const getTransactionsByFamilyAndMonth = (familyId: string, year: number, month: number) => {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const nextMonth = month === 11 ? { m: 0, y: year + 1 } : { m: month + 1, y: year }
  const endDate = `${nextMonth.y}-${String(nextMonth.m + 1).padStart(2, '0')}-01`
  return pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `family_id = "${familyId}" && transaction_date >= "${startDate}" && transaction_date < "${endDate}"`,
    sort: '-transaction_date',
    expand: 'owner_id,category_id',
  })
}

export const createTransaction = (data: Partial<TransactionRecord>) =>
  pb.collection('transactions').create<TransactionRecord>(data)

export const updateTransaction = (id: string, data: Partial<TransactionRecord>) =>
  pb.collection('transactions').update<TransactionRecord>(id, data)

export const deleteTransaction = (id: string) => pb.collection('transactions').delete(id)
