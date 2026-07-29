import pb from '@/lib/pocketbase/client'
import type { CreditCardRecord } from '@/types/finance'

export const getCreditCardsByFamilyId = (familyId: string) =>
  pb.collection('credit_cards').getFullList<CreditCardRecord>({
    filter: `family_id = "${familyId}"`,
    sort: 'created',
    expand: 'owner_id',
  })

export const getCreditCard = (id: string) =>
  pb.collection('credit_cards').getOne<CreditCardRecord>(id, { expand: 'owner_id' })

export const createCreditCard = (data: Partial<CreditCardRecord>) =>
  pb.collection('credit_cards').create<CreditCardRecord>(data)

export const updateCreditCard = (id: string, data: Partial<CreditCardRecord>) =>
  pb.collection('credit_cards').update<CreditCardRecord>(id, data)

export const deleteCreditCard = (id: string) => pb.collection('credit_cards').delete(id)
