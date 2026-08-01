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

export const getChallengeById = (id: string) =>
  pb.collection('challenges').getOne<ChallengeRecord>(id, { expand: 'user_id' })

export const duplicateChallenge = async (
  challengeId: string,
  memberId: string,
  familyId: string,
) => {
  const original = await pb.collection('challenges').getOne<ChallengeRecord>(challengeId)
  return pb.collection('challenges').create<ChallengeRecord>({
    family_id: familyId,
    user_id: memberId,
    type: original.type,
    title: original.title,
    description: original.description,
    target_value: original.target_value,
    current_value: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'active',
    points: original.points,
    badge_type: original.badge_type,
  })
}
