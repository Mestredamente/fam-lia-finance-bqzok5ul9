import { Family, FixedBill, UserProfile } from '@/types/finance'

const delay = (ms: number = 800) => new Promise((resolve) => setTimeout(resolve, ms))

export const initialUser: UserProfile = {
  id: 'usr_carlos',
  name: 'Carlos Silva',
  email: 'carlos@email.com',
  role: 'Esposo',
  income: 7000,
  payDay: 5,
}

export const initialFamily: Family = {
  id: 'fam_silva',
  name: 'Família Silva',
  code: 'FAM-1234',
  members: [
    {
      id: 'usr_carlos',
      name: 'Carlos',
      role: 'Esposo',
      income: 7000,
      expenses: 4500,
      joined: true,
    },
    {
      id: 'usr_ana',
      name: 'Ana',
      role: 'Esposa',
      income: 5500,
      expenses: 3730,
      joined: false,
    },
  ],
}

export const initialBills: FixedBill[] = [
  { id: 'b1', name: 'Aluguel', dueDate: 10, amount: 2200, status: 'pago', category: 'Moradia' },
  { id: 'b2', name: 'Condomínio', dueDate: 10, amount: 450, status: 'pago', category: 'Moradia' },
  {
    id: 'b3',
    name: 'Energia elétrica',
    dueDate: 15,
    amount: 280,
    status: 'pendente',
    category: 'Contas',
  },
  {
    id: 'b4',
    name: 'Internet Fibra',
    dueDate: 20,
    amount: 99.9,
    status: 'pendente',
    category: 'Serviços',
  },
  {
    id: 'b5',
    name: 'Plano de Saúde',
    dueDate: 25,
    amount: 890,
    status: 'atrasado',
    category: 'Saúde',
  },
]

export async function validateFamilyCode(code: string): Promise<string> {
  await delay()
  if (code.trim().toUpperCase() === 'FAM-1234') {
    return 'Família Silva'
  }
  throw new Error('Código não encontrado')
}
