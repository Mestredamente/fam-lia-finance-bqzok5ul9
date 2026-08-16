import pb from '@/lib/pocketbase/client'
import type { RecurringTransaction } from '@/types/finance'

export const getRecurringTransactionsByFamilyId = (familyId: string) =>
  pb.collection('recurring_transactions').getFullList<RecurringTransaction>({
    filter: `family_id = "${familyId}"`,
    sort: '-created',
    expand: 'member_id,category_id,card_id',
  })

export const createRecurringTransaction = (data: Partial<RecurringTransaction>) =>
  pb.collection('recurring_transactions').create<RecurringTransaction>(data)

export const updateRecurringTransaction = (id: string, data: Partial<RecurringTransaction>) =>
  pb.collection('recurring_transactions').update<RecurringTransaction>(id, data)

export const deleteRecurringTransaction = (id: string) =>
  pb.collection('recurring_transactions').delete(id)
