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

export type AccessLevel = 'guardian' | 'co_admin' | 'member' | 'guest'

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
  access_level?: AccessLevel
  perm_view_others?: boolean
  perm_edit_others?: boolean
  perm_view_patrimony?: boolean
  perm_view_budgets?: boolean
  perm_import_invoices?: boolean
  perm_delete_transactions?: boolean
  perm_delete_invoices?: boolean
  perm_manage_debts?: boolean
  perm_manage_members?: boolean
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

export type TransactionType = 'expense' | 'income'

export type TransactionSource =
  | 'manual'
  | 'invoice_import'
  | 'recurring_debt'
  | 'future_installment'
  | 'recurring'
  | 'debt_payment'
  | 'investment'
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
  invoice_item_id?: string | null
  status?: 'pending' | 'paid'
  purchase_date?: string | null
  is_installment?: boolean
  installment_current?: number | null
  installment_total?: number | null
  installment_due_day?: number | null
  installment_start_date?: string | null
  parent_transaction_id?: string | null
  debt_id?: string | null
  recurring_id?: string | null
  investment_id?: string | null
  invoice_id?: string | null
  card_id?: string | null
  emotion?: TransactionEmotion | null
  emotion_note?: string | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
    category_id?: CategoryRecord
    recurring_id?: RecurringTransaction
  }
}

export interface CategoryRecord {
  id: string
  family_id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  is_fixed: boolean
  is_custom: boolean
  created_by?: string
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    created_by?: AuthUser
  }
}

export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly'

export type RecurringType = 'receita' | 'despesa'

export type RecurringEmotion =
  | 'feliz'
  | 'necessario'
  | 'neutro'
  | 'arrependido'
  | 'impulsivo'
  | 'ansioso'

export interface RecurringTransaction {
  id: string
  family_id: string
  member_id: string
  description: string
  amount: number
  type: RecurringType
  category_id?: string | null
  emotion?: RecurringEmotion | null
  frequency: RecurringFrequency
  day_of_month: number
  card_id?: string | null
  shared: boolean
  active: boolean
  start_date: string
  end_date?: string | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    member_id?: MemberRecord
    category_id?: CategoryRecord
    card_id?: CreditCardRecord
  }
}

export type SavingsGoalStatus = 'active' | 'completed' | 'paused'

export interface SavingsGoal {
  id: string
  family_id: string
  title: string
  description?: string | null
  target_amount: number
  current_amount: number
  deadline?: string | null
  category_id?: string | null
  color?: string | null
  icon?: string | null
  status: SavingsGoalStatus
  created_by?: string | null
  completed_at?: string | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    category_id?: CategoryRecord
    created_by?: AuthUser
  }
}

export type TransactionEmotion =
  | 'happy'
  | 'necessary'
  | 'regret'
  | 'impulsive'
  | 'neutral'
  | 'grateful'
  | 'surprised'
  | 'anxious'

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
  status: 'pending' | 'reviewed' | 'paid' | 'parsed' | 'error' | 'partial'
  raw_file_url: string
  parsed_data: string
  parsed_at: string
  reviewed_at?: string | null
  partial_amount?: number | null
  paid_at?: string | null
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
  excluded?: boolean
  is_installment?: boolean
  installment_current?: number | null
  installment_total?: number | null
  parent_installment_id?: string | null
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
  | 'imovel'
  | 'terreno'
  | 'veiculo'
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
  category_id?: string | null
  end_date?: string | null
  status?: 'active' | 'paid_off' | 'overdue'
  frequency?: 'monthly' | 'yearly' | 'weekly'
  auto_create_transaction?: boolean
  // Extensão 0058
  down_payment?: number | null
  installment_value?: number | null
  installments_total?: number | null
  installments_paid?: number | null
  has_recurring_contribution?: boolean
  contribution_amount?: number | null
  contribution_day?: number | null
  contribution_start_date?: string | null
  contribution_end_date?: string | null
  generate_expense?: boolean
  expense_category_id?: string | null
  installment_due_day?: number | null
  installment_start_date?: string | null
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
    category_id?: CategoryRecord
  }
}

export type DebtType =
  | 'financing'
  | 'loan'
  | 'credit_card'
  | 'financing_home'
  | 'financing_car'
  | 'personal_loan'
  | 'utility'
  | 'subscription'
  | 'rent'
  | 'condo'
  | 'other'

export type BillStatus = 'paga' | 'vencida' | 'a_vencer' | 'futura'
export type BillSource = 'recurring' | 'investment' | 'debt' | 'invoice'

export interface BillItem {
  id: string
  description: string
  amount: number
  dueDate: string
  source: BillSource
  status: BillStatus
  originId: string
  extraInfo?: string
  categoryId?: string
  type: 'expense' | 'income'
  paidDate?: string
  transactionId?: string
  // Invoice-specific fields
  cardId?: string
  cardName?: string
  invoiceId?: string
  minimumPayment?: number
  monthRef?: string
}

export interface BillSummary {
  totalMes: number
  totalPagas: number
  countPagas: number
  totalRestante: number
  countRestante: number
  totalVencidas: number
  countVencidas: number
}

export interface BillAlert {
  type: 'overdue' | 'upcoming'
  count: number
  total: number
  accounts: BillItem[]
}

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
  category_id?: string | null
  end_date?: string | null
  status?: 'active' | 'paid_off' | 'overdue'
  frequency?: 'monthly' | 'yearly' | 'weekly'
  auto_create_transaction?: boolean
  created: string
  updated: string
  expand?: {
    family_id?: FamilyRecord
    owner_id?: MemberRecord
  }
}
