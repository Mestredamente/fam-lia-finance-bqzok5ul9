import {
  Landmark,
  TrendingUp,
  Building,
  PiggyBank,
  Coins,
  Bitcoin,
  CircleDollarSign,
  Home,
  Car,
  Map,
  HandCoins,
  CreditCard,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import type { InvestmentType, InterestType, DebtType } from '@/types/finance'

interface TypeMeta {
  label: string
  icon: LucideIcon
  color: string
}

export const investmentTypeMeta: Record<InvestmentType, TypeMeta> = {
  cdb: { label: 'CDB', icon: Landmark, color: '#3B82F6' },
  tesouro: { label: 'Tesouro', icon: Landmark, color: '#059669' },
  acoes: { label: 'Ações', icon: TrendingUp, color: '#8B5CF6' },
  fii: { label: 'FII', icon: Building, color: '#F59E0B' },
  poupanca: { label: 'Poupança', icon: PiggyBank, color: '#EC4899' },
  renda_fixa: { label: 'Renda Fixa', icon: Coins, color: '#14B8A6' },
  cripto: { label: 'Cripto', icon: Bitcoin, color: '#F97316' },
  imovel: { label: 'Imóvel', icon: Home, color: '#DC2626' },
  terreno: { label: 'Terreno', icon: Map, color: '#16A34A' },
  veiculo: { label: 'Veículo', icon: Car, color: '#2563EB' },
  outro: { label: 'Outro', icon: CircleDollarSign, color: '#6B7280' },
}

export const debtTypeMeta: Record<DebtType, TypeMeta> = {
  financing: { label: 'Financiamento', icon: Home, color: '#EF4444' },
  loan: { label: 'Empréstimo', icon: HandCoins, color: '#F59E0B' },
  credit_card: { label: 'Cartão de Crédito', icon: CreditCard, color: '#6366F1' },
  financing_home: { label: 'Fin. Imobiliário', icon: Home, color: '#DC2626' },
  financing_car: { label: 'Fin. de Veículo', icon: Car, color: '#EA580C' },
  personal_loan: { label: 'Empréstimo Pessoal', icon: HandCoins, color: '#D97706' },
  utility: { label: 'Contas de Consumo', icon: FileText, color: '#0284C7' },
  subscription: { label: 'Assinaturas', icon: FileText, color: '#8B5CF6' },
  rent: { label: 'Aluguel', icon: Home, color: '#E11D48' },
  condo: { label: 'Condomínio', icon: Building, color: '#7C3AED' },
  other: { label: 'Outros', icon: FileText, color: '#6B7280' },
}

export const interestTypeLabels: Record<InterestType, string> = {
  cdi: '% do CDI',
  fixed: 'Taxa fixa anual',
  ipca: 'IPCA+',
  prefixed: 'Pré-fixado',
}

export const debtFormTypes: { value: DebtType; label: string }[] = [
  { value: 'financing_home', label: 'Financiamento Imobiliário' },
  { value: 'financing_car', label: 'Financiamento de Veículo' },
  { value: 'personal_loan', label: 'Empréstimo Pessoal' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'other', label: 'Outros' },
]

export function getInvestmentMeta(type: string): TypeMeta {
  return investmentTypeMeta[type as InvestmentType] || investmentTypeMeta.outro
}

export function getDebtMeta(type: string): TypeMeta {
  return debtTypeMeta[type as DebtType] || debtTypeMeta.other
}
