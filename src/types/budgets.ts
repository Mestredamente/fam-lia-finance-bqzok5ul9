import type { CategoryRecord, MemberRecord, FamilyRecord } from '@/types/finance'

export interface BudgetRecord {
  id: string
  family_id: string
  category_id: string
  member_id: string | null
  monthly_limit: number
  is_active: boolean
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    category_id?: CategoryRecord
    member_id?: MemberRecord
  }
}
