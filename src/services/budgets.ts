import pb from '@/lib/pocketbase/client'
import type { BudgetRecord } from '@/types/budgets'

export const getBudgetsByFamilyId = (familyId: string) =>
  pb.collection('budgets').getFullList<BudgetRecord>({
    filter: `family_id = "${familyId}" && is_active = true`,
    sort: 'created',
    expand: 'category_id,member_id',
  })

export const createBudget = (data: Partial<BudgetRecord>) =>
  pb.collection('budgets').create<BudgetRecord>(data)

export const updateBudget = (id: string, data: Partial<BudgetRecord>) =>
  pb.collection('budgets').update<BudgetRecord>(id, data)

export const deleteBudget = (id: string) => pb.collection('budgets').delete(id)
