import pb from '@/lib/pocketbase/client'
import type { InvestmentRecord } from '@/types/finance'

export const getInvestmentsByFamilyId = (familyId: string, memberId?: string) => {
  let filter = `family_id = "${familyId}" && is_active = true`
  if (memberId) filter += ` && owner_id = "${memberId}"`
  return pb.collection('investments').getFullList<InvestmentRecord>({
    filter,
    sort: '-created',
    expand: 'owner_id',
  })
}

export const getInvestmentsByOwner = (memberId: string) =>
  pb.collection('investments').getFullList<InvestmentRecord>({
    filter: `owner_id = "${memberId}" && is_active = true`,
    sort: '-created',
  })

export const createInvestment = (data: Partial<InvestmentRecord>) =>
  pb.collection('investments').create<InvestmentRecord>(data)

export const updateInvestment = (id: string, data: Partial<InvestmentRecord>) =>
  pb.collection('investments').update<InvestmentRecord>(id, data)

export const deleteInvestment = (id: string) => pb.collection('investments').delete(id)
