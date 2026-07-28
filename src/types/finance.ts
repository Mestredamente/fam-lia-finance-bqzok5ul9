export type MemberRole = 'husband' | 'wife' | 'partner' | 'child'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  created: string
  updated: string
}

export interface FamilyRecord {
  id: string
  name: string
  invite_code: string
  created_by: string
  created: string
  updated: string
}

export interface MemberRecord {
  id: string
  family_id: string
  user_id: string
  role: MemberRole
  display_name: string
  email: string
  monthly_income: number | null
  payday: number | null
  notify_bills: boolean
  notify_ai_tips: boolean
  share_data: boolean
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    user_id?: AuthUser
  }
}

export interface InviteRecord {
  id: string
  family_id: string
  invite_code: string
  created_by: string
  used_by: string
  used_at: string
  expires_at: string
  created: string
  expand?: {
    family_id?: FamilyRecord
  }
}

export interface UserPreferences {
  notify_bills: boolean
  notify_ai_tips: boolean
  share_data: boolean
}

export const roleLabels: Record<MemberRole, string> = {
  husband: 'Esposo',
  wife: 'Esposa',
  partner: 'Cônjuge',
  child: 'Filho(a)',
}

export function getRoleLabel(role: string): string {
  return roleLabels[role as MemberRole] || role
}

export interface FixedBill {
  id: string
  name: string
  amount: number
  dueDateDay: number
  status: 'Pago' | 'Pendente' | 'Atrasado'
}
