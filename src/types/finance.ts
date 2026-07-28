export type UserRole = 'Esposo' | 'Esposa'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  monthlyIncome: number
  payDay: number
  totalInvested: number
  totalDebts: number
}

export interface FamilyMember {
  id: string
  name: string
  role: UserRole
  joined: boolean
  avatarUrl?: string
  income: number
  expenses: number
}

export interface Family {
  id: string
  name: string
  inviteCode: string
  members: FamilyMember[]
}

export interface FixedBill {
  id: string
  name: string
  dueDateDay: number
  amount: number
  status: 'Pago' | 'Pendente' | 'Atrasado'
  category: string
}

export interface UserPreferences {
  dueNotifications: boolean
  aiTips: boolean
  shareDataWithSpouse: boolean
}
