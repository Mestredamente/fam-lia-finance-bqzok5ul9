import pb from '@/lib/pocketbase/client'
import type { ChallengeRecord } from '@/types/finance'

export const getChallengesByFamilyId = (familyId: string) =>
  pb.collection('challenges').getFullList<ChallengeRecord>({
    filter: `family_id = "${familyId}"`,
    sort: '-created',
    expand: 'user_id',
  })

export const createChallenge = (data: Partial<ChallengeRecord>) =>
  pb.collection('challenges').create<ChallengeRecord>(data)

export const updateChallenge = (id: string, data: Partial<ChallengeRecord>) =>
  pb.collection('challenges').update<ChallengeRecord>(id, data)

export const deleteChallenge = (id: string) => pb.collection('challenges').delete(id)
