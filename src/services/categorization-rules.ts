import pb from '@/lib/pocketbase/client'
import type { CategorizationRuleRecord } from '@/types/categorization-rules'

export const getRulesByFamilyId = (familyId: string) =>
  pb.collection('categorization_rules').getFullList<CategorizationRuleRecord>({
    filter: `family_id = "${familyId}"`,
    sort: '-created',
    expand: 'category_id',
  })

export const createRule = (data: Partial<CategorizationRuleRecord>) =>
  pb.collection('categorization_rules').create<CategorizationRuleRecord>(data)

export const updateRule = (id: string, data: Partial<CategorizationRuleRecord>) =>
  pb.collection('categorization_rules').update<CategorizationRuleRecord>(id, data)

export const deleteRule = (id: string) => pb.collection('categorization_rules').delete(id)
