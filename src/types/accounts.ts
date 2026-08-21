import type { FamilyRecord } from './finance'

export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment'

export interface Account {
  id: string
  family_id: string
  name: string
  type: AccountType
  bank?: string
  initial_balance?: number
  color?: string
  icon?: string
  is_active?: boolean
  created: string
  updated: string
  current_balance?: number
  expand?: {
    family_id?: FamilyRecord
  }
}

export interface CreateAccountInput {
  family_id: string
  name: string
  type: AccountType
  bank?: string
  initial_balance?: number
  color?: string
  icon?: string
  is_active?: boolean
}

export interface UpdateAccountInput {
  name?: string
  type?: AccountType
  bank?: string
  initial_balance?: number
  color?: string
  icon?: string
  is_active?: boolean
}
