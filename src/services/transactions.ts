import pb from '@/lib/pocketbase/client'
import type { TransactionRecord } from '@/types/finance'

export const getTransactionsByFamilyAndPeriod = (
  familyId: string,
  startDate: string | null,
  endDate: string | null,
) => {
  if (!startDate || !endDate) {
    return pb.collection('transactions').getFullList<TransactionRecord>({
      filter: `family_id = "${familyId}"`,
      sort: '-transaction_date',
      expand: 'owner_id,category_id',
    })
  }
  return pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `family_id = "${familyId}" && transaction_date >= "${startDate}" && transaction_date < "${endDate}"`,
    sort: '-transaction_date',
    expand: 'owner_id,category_id',
  })
}

export const getTransactionsCountOutsideRange = (
  familyId: string,
  startDate: string,
  endDate: string,
) =>
  pb
    .collection('transactions')
    .getList(1, 1, {
      filter: `family_id = "${familyId}" && (transaction_date < "${startDate}" || transaction_date >= "${endDate}")`,
    })
    .then((r) => r.totalItems)
function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const nextMonth = month === 11 ? { m: 0, y: year + 1 } : { m: month + 1, y: year }
  const endDate = `${nextMonth.y}-${String(nextMonth.m + 1).padStart(2, '0')}-01`
  return { startDate, endDate }
}

export const getTransactionsByFamilyAndMonth = (
  familyId: string,
  year: number,
  month: number,
  memberId?: string,
) => {
  const { startDate, endDate } = getMonthRange(year, month)
  let filter = `family_id = "${familyId}" && transaction_date >= "${startDate}" && transaction_date < "${endDate}"`
  if (memberId) filter += ` && owner_id = "${memberId}"`
  return pb.collection('transactions').getFullList<TransactionRecord>({
    filter,
    sort: '-transaction_date',
    expand: 'owner_id,category_id',
  })
}

export const getFixedBillsByFamilyAndMonth = (familyId: string, year: number, month: number) => {
  const { startDate, endDate } = getMonthRange(year, month)
  return pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `family_id = "${familyId}" && is_fixed = true && transaction_date >= "${startDate}" && transaction_date < "${endDate}"`,
    sort: 'transaction_date',
    expand: 'owner_id,category_id',
  })
}

export const getTransactionsByMember = (memberId: string) =>
  pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `owner_id = "${memberId}"`,
    sort: '-transaction_date',
    expand: 'category_id',
  })

export const createTransaction = (data: Partial<TransactionRecord>) =>
  pb.collection('transactions').create<TransactionRecord>(data)

export const updateTransaction = (id: string, data: Partial<TransactionRecord>) =>
  pb.collection('transactions').update<TransactionRecord>(id, data)

export const deleteTransaction = (id: string) => pb.collection('transactions').delete(id)

export const getTransactionsByFamilyAndDateRange = (
  familyId: string,
  startDate: string,
  endDate: string,
) =>
  pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `family_id = "${familyId}" && transaction_date >= "${startDate}" && transaction_date < "${endDate}"`,
    sort: '-transaction_date',
    expand: 'owner_id,category_id',
  })
