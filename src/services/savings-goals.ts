import pb from '@/lib/pocketbase/client'
import type { SavingsGoal } from '@/types/finance'

export const getSavingsGoalsByFamilyId = (familyId: string) =>
  pb.collection('savings_goals').getFullList<SavingsGoal>({
    filter: `family_id = "${familyId}"`,
    sort: '-created',
    expand: 'family_id,category_id,created_by',
  })

export const createSavingsGoal = (data: Partial<SavingsGoal>) =>
  pb.collection('savings_goals').create<SavingsGoal>(data)

export const updateSavingsGoal = (id: string, data: Partial<SavingsGoal>) =>
  pb.collection('savings_goals').update<SavingsGoal>(id, data)

export const deleteSavingsGoal = (id: string) => pb.collection('savings_goals').delete(id)
