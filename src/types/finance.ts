export type MemberRole =
  | 'self'
  | 'husband'
  | 'wife'
  | 'partner'
  | 'boyfriend'
  | 'girlfriend'
  | 'cohabitant'
  | 'roommate'
  | 'son'
  | 'daughter'
  | 'stepson'
  | 'stepdaughter'
  | 'father'
  | 'mother'
  | 'father_in_law'
  | 'mother_in_law'
  | 'co_parent'
  | 'guardian'
  | 'grandfather'
  | 'grandmother'
  | 'brother'
  | 'sister'
  | 'uncle'
  | 'aunt'
  | 'nephew'
  | 'niece'
  | 'cousin'
  | 'dependent_adult'
  | 'household_member'
  | 'other'
  | 'child'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  created: string
  updated: string
}

export interface PayoffPlan {
  strategy: 'snowball' | 'avalanche'
  extraMonthly: number
  calculatedAt: string
}

export interface FamilyRecord {
  id: string
  name: string
  invite_code: string
  created_by: string
  payoff_plan?: PayoffPlan | null
  created: string
  updated: string
}

export interface MemberRecord {
  id: string
  family_id: string
  user_id?: string | null
  role: MemberRole
  display_name: string
  email: string
  monthly_income: number | null
  payday: number | null
  notify_bills: boolean
  notify_ai_tips: boolean
  share_data: boolean
  birth_date?: string | null
  is_dependent: boolean
  monthly_allowance?: number | null
  monthly_income_real?: number | null
  occupation?: string | null
  avatar_url?: string | null
  is_active: boolean
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
  used_by: string | null
  used_at: string | null
  expires_at: string
  created: string
  updated?: string
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
  self: 'Eu / Titular',
  husband: 'Esposo',
  wife: 'Esposa',
  partner: 'Parceiro(a)',
  boyfriend: 'Namorado',
  girlfriend: 'Namorada',
  cohabitant: 'Coabitante',
  roommate: 'Colega de moradia',
  son: 'Filho',
  daughter: 'Filha',
  stepson: 'Enteado',
  stepdaughter: 'Enteada',
  father: 'Pai',
  mother: 'Mãe',
  father_in_law: 'Sogro',
  mother_in_law: 'Sogra',
  co_parent: 'Copai/mãe',
  guardian: 'Guardião(ã)',
  grandfather: 'Avô',
  grandmother: 'Avó',
  brother: 'Irmão',
  sister: 'Irmã',
  uncle: 'Tio',
  aunt: 'Tia',
  nephew: 'Sobrinho',
  niece: 'Sobrinha',
  cousin: 'Primo(a)',
  dependent_adult: 'Adulto dependente',
  household_member: 'Membro do domicílio',
  other: 'Outro',
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

export type CategoryType = 'expense' | 'income' | 'investment' | 'debt'

export type TransactionType = 'expense' | 'income' | 'investment' | 'debt_payment'

export type TransactionSource = 'manual' | 'invoice_import'

export interface CategoryRecord {
  id: string
  family_id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  is_fixed: boolean
  is_custom: boolean
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
  }
}

export interface TransactionRecord {
  id: string
  family_id: string
  owner_id: string
  category_id: string
  type: TransactionType
  amount: number
  description: string
  transaction_date: string
  is_shared: boolean
  is_fixed: boolean
  source: TransactionSource
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
    category_id?: CategoryRecord
  }
}

export interface CreditCardRecord {
  id: string
  family_id: string
  owner_id: string
  name: string
  card_brand: 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Outros'
  closing_day: number
  due_day: number
  credit_limit: number | null
  is_active: boolean
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
  }
}

export interface AIInsight {
  titulo: string
  descricao: string
  tipo: 'alerta' | 'oportunidade' | 'educacao' | 'comportamento'
  prioridade: 'alta' | 'media' | 'baixa'
  acao_recomendada: string
}

export interface AIConversationRecord {
  id: string
  family_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created: string
  updated: string
}

export interface InvoiceRecord {
  id: string
  card_id: string
  family_id: string
  owner_id: string
  month_ref: string
  total_amount: number
  status: 'pending' | 'reviewed' | 'paid'
  raw_file_url: string
  parsed_data: string
  parsed_at: string
  created: string
  updated: string
  expand?: {
    card_id?: CreditCardRecord
    family_id?: FamilyRecord
    owner_id?: MemberRecord
  }
}

export interface InvoiceItemRecord {
  id: string
  invoice_id: string
  family_id: string
  description: string
  amount: number
  transaction_date: string
  suggested_category_id: string
  confirmed_category_id: string
  is_confirmed: boolean
  converted_transaction_id: string
  created: string
  updated: string
  expand?: {
    invoice_id?: InvoiceRecord
    family_id?: FamilyRecord
    suggested_category_id?: CategoryRecord
    confirmed_category_id?: CategoryRecord
    converted_transaction_id?: TransactionRecord
  }
}

export type InvestmentType =
  | 'cdb'
  | 'tesouro'
  | 'acoes'
  | 'fii'
  | 'poupanca'
  | 'renda_fixa'
  | 'cripto'
  | 'outro'

export type InterestType = 'cdi' | 'fixed' | 'ipca' | 'prefixed'

export interface InvestmentRecord {
  id: string
  family_id: string
  owner_id: string
  type: InvestmentType
  name: string
  institution: string
  amount_invested: number
  current_value: number
  interest_rate: number | null
  interest_type: InterestType | null
  maturity_date: string | null
  is_active: boolean
  notes: string | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
  }
}

export type DebtType =
  | 'financing'
  | 'loan'
  | 'credit_card'
  | 'financing_home'
  | 'financing_car'
  | 'personal_loan'
  | 'other'

export interface DebtRecord {
  id: string
  family_id: string
  owner_id: string
  description: string
  type: DebtType
  total_amount: number
  remaining_amount: number
  installment_value: number
  installments_total: number
  installments_paid: number
  installments_remaining: number
  interest_rate: number
  due_day: number
  start_date: string
  is_active: boolean
  notes: string | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
  }
}
