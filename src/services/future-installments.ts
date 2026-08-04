import pb from '@/lib/pocketbase/client'
import type { TransactionRecord } from '@/types/finance'

export const getFutureInstallments = (familyId: string) => {
  const today = new Date().toISOString().split('T')[0]
  return pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `family_id = "${familyId}" && source = "future_installment" && transaction_date > "${today}"`,
    sort: 'transaction_date',
    expand: 'owner_id,category_id',
  })
}

export const deleteFutureInstallments = async (parentTransactionId: string) => {
  const items = await pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `parent_transaction_id = "${parentTransactionId}"`,
  })
  await Promise.all(items.map((t) => pb.collection('transactions').delete(t.id)))
}
