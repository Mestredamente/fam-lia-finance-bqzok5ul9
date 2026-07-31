import pb from '@/lib/pocketbase/client'
import type { MemberRecord } from '@/types/finance'

export const getMemberByUserId = (userId: string) =>
  pb.collection('members').getFirstListItem<MemberRecord>(`user_id = "${userId}"`)

export const getMembersByFamilyId = (familyId: string) =>
  pb.collection('members').getFullList<MemberRecord>({
    filter: `family_id = "${familyId}"`,
    sort: 'created',
  })

export const getActiveMembersByFamilyId = (familyId: string) =>
  pb.collection('members').getFullList<MemberRecord>({
    filter: `family_id = "${familyId}" && is_active = true`,
    sort: 'created',
  })

export const softDeleteMember = (id: string) =>
  pb.collection('members').update<MemberRecord>(id, { is_active: false })

export const createMember = (data: Partial<MemberRecord>) =>
  pb.collection('members').create<MemberRecord>(data)

export const updateMember = (id: string, data: Partial<MemberRecord>) =>
  pb.collection('members').update<MemberRecord>(id, data)

export const deleteMember = (id: string) =>
  pb.send(`/backend/v1/members/${id}/cascade`, { method: 'DELETE' })
