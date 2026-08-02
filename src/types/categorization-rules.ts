import type { FamilyRecord, CategoryRecord, AuthUser } from '@/types/finance'

export type MatchType = 'contains' | 'starts_with'

export interface CategorizationRuleRecord {
  id: string
  family_id: string
  keyword: string
  category_id: string
  match_type: MatchType
  created_by?: string
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    category_id?: CategoryRecord
    created_by?: AuthUser
  }
}
