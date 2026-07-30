import type { FamilyRecord, MemberRecord, TransactionRecord } from '@/types/finance'

export type HouseholdTaskCategory =
  | 'maintenance'
  | 'repair'
  | 'purchase'
  | 'appointment'
  | 'deadline'
  | 'subscription_review'
  | 'planning'
  | 'other'

export type HouseholdTaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type HouseholdTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  estimated_price: number
  actual_price: number | null
  checked: boolean
}

export interface HouseholdTaskRecord {
  id: string
  family_id: string
  assigned_to: string | null
  created_by: string
  title: string
  description: string
  category: HouseholdTaskCategory
  priority: HouseholdTaskPriority
  estimated_cost: number | null
  actual_cost: number | null
  due_date: string | null
  completed_at: string | null
  status: HouseholdTaskStatus
  converted_transaction_id: string | null
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  shopping_items: ShoppingItem[] | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    assigned_to?: MemberRecord
    created_by?: MemberRecord
    converted_transaction_id?: TransactionRecord
  }
}

export interface CompleteTaskOptions {
  actual_cost: number | null
  create_transaction: boolean
  transaction_category_id?: string
  transaction_owner_id?: string
  transaction_date?: string
}

export interface CompleteTaskResult {
  task: HouseholdTaskRecord
  transactionCreated: boolean
  transactionAmount: number | null
  nextOccurrenceDate: string | null
}

export interface HouseholdTaskFilters {
  status?: HouseholdTaskStatus
  category?: HouseholdTaskCategory
  assigned_to?: string
}
