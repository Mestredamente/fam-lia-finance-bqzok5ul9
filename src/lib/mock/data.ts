import { Family, UserProfile, FixedBill, UserPreferences } from '@/types/finance'

export const INITIAL_USER: UserProfile = {
  id: 'usr_carlos_1',
  name: 'Carlos Silva',
  email: 'carlos@email.com',
  role: 'Esposo',
  avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=101',
  monthlyIncome: 7000,
  payDay: 5,
  totalInvested: 15400,
  totalDebts: 0,
}

export const INITIAL_FAMILY: Family = {
  id: 'fam_silva_1',
  name: 'Família Silva',
  inviteCode: 'FAM-1234',
  members: [
    {
      id: 'usr_carlos_1',
      name: 'Carlos Silva',
      role: 'Esposo',
      joined: true,
      avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=101',
      income: 7000,
      expenses: 4500,
    },
    {
      id: 'usr_ana_2',
      name: 'Ana Silva',
      role: 'Esposa',
      joined: true,
      avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=102',
      income: 5500,
      expenses: 3730,
    },
  ],
}

export const INITIAL_FIXED_BILLS: FixedBill[] = [
  {
    id: 'b1',
    name: 'Aluguel do Imóvel',
    dueDateDay: 10,
    amount: 2200,
    status: 'Pago',
    category: 'Moradia',
  },
  {
    id: 'b2',
    name: 'Condomínio Residencial',
    dueDateDay: 10,
    amount: 450,
    status: 'Pago',
    category: 'Moradia',
  },
  {
    id: 'b3',
    name: 'Energia Elétrica (Enel)',
    dueDateDay: 15,
    amount: 280,
    status: 'Pendente',
    category: 'Contas',
  },
  {
    id: 'b4',
    name: 'Internet Fibra 500MB',
    dueDateDay: 20,
    amount: 99.9,
    status: 'Pendente',
    category: 'Serviços',
  },
  {
    id: 'b5',
    name: 'Plano de Saúde Familiar',
    dueDateDay: 25,
    amount: 890,
    status: 'Atrasado',
    category: 'Saúde',
  },
]

export const INITIAL_PREFERENCES: UserPreferences = {
  dueNotifications: true,
  aiTips: true,
  shareDataWithSpouse: true,
}
