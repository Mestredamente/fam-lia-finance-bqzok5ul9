import { createContext, useState, ReactNode } from 'react'
import { UserProfile, Family, FixedBill, UserPreferences } from '@/types/finance'
import { initialUser, initialFamily, initialBills } from '@/lib/mock/finance-service'

interface MockAuthContextType {
  user: UserProfile | null
  family: Family | null
  bills: FixedBill[]
  preferences: UserPreferences
  isAuthenticated: boolean
  login: (email: string, pass: string) => Promise<{ success: boolean; redirectPath: string }>
  registerOnboarding: (
    data: Partial<UserProfile> & { familyName?: string; familyCode?: string },
  ) => Promise<void>
  updatePreferences: (key: keyof UserPreferences, val: boolean) => void
  generateInviteCode: () => string
  logout: () => void
  deleteAccount: () => Promise<void>
}

export const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined)

export const MockAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  const [family, setFamily] = useState<Family | null>(initialFamily)
  const [bills] = useState<FixedBill[]>(initialBills)
  const [preferences, setPreferences] = useState<UserPreferences>({
    dueNotifications: true,
    aiTips: true,
    shareWithSpouse: true,
  })

  const isAuthenticated = !!user

  const login = async (email: string, pass: string) => {
    await new Promise((r) => setTimeout(r, 800))
    if (email === 'carlos@email.com' && pass.length >= 6) {
      setUser(initialUser)
      setFamily(initialFamily)
      const activeMembers = initialFamily.members.filter((m) => m.joined)
      const redirectPath = activeMembers.length <= 1 ? '/onboarding' : '/dashboard'
      return { success: true, redirectPath }
    }
    throw new Error('E-mail ou senha incorretos')
  }

  const registerOnboarding = async (
    data: Partial<UserProfile> & { familyName?: string; familyCode?: string },
  ) => {
    await new Promise((r) => setTimeout(r, 800))
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: data.name || 'Novo Usuário',
      email: data.email || 'usuario@email.com',
      role: data.role || 'Esposo',
      income: data.income || 5000,
      payDay: data.payDay || 5,
    }
    setUser(newUser)

    const newFamily: Family = {
      id: `fam_${Date.now()}`,
      name: data.familyName || 'Família Silva',
      code: 'FAM-XY78',
      members: [
        {
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          income: newUser.income,
          expenses: 0,
          joined: true,
        },
      ],
    }
    setFamily(newFamily)
  }

  const updatePreferences = (key: keyof UserPreferences, val: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: val }))
  }

  const generateInviteCode = () => {
    const newCode = `FAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    if (family) {
      setFamily({ ...family, code: newCode })
    }
    return newCode
  }

  const logout = () => {
    setUser(null)
    setFamily(null)
  }

  const deleteAccount = async () => {
    await new Promise((r) => setTimeout(r, 800))
    setUser(null)
    setFamily(null)
  }

  return (
    <MockAuthContext.Provider
      value={{
        user,
        family,
        bills,
        preferences,
        isAuthenticated,
        login,
        registerOnboarding,
        updatePreferences,
        generateInviteCode,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  )
}
