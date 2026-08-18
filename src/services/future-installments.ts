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
// NOTE: deleting the filhas of a parcelada is now handled automatically
// by the backend cascade hook (onRecordAfterDeleteRequest on `transactions`),
// so there is no longer a client-side deleteFutureInstallments helper.
