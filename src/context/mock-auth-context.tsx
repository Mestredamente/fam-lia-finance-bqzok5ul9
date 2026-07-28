import { createContext, useState, ReactNode } from 'react'
import { UserProfile, Family, FixedBill, UserPreferences, UserRole } from '@/types/finance'
import { mockService } from '@/lib/mock/service'

interface MockAuthContextType {
  user: UserProfile | null
  family: Family | null
  bills: FixedBill[]
  preferences: UserPreferences
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  register: (data: {
    name: string
    email: string
    role: UserRole
    familyName?: string
    monthlyIncome: number
    payDay: number
    dueNotifications: boolean
    aiTips: boolean
  }) => Promise<void>
  logout: () => void
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>
  generateInviteCode: () => Promise<string>
  deleteAccount: () => Promise<void>
}

export const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined)

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const initial = mockService.getInitialState()
  const [user, setUser] = useState<UserProfile | null>(initial.user)
  const [family, setFamily] = useState<Family | null>(initial.family)
  const [bills] = useState<FixedBill[]>(initial.bills)
  const [preferences, setPreferences] = useState<UserPreferences>(initial.preferences)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const login = async (email: string, pass: string) => {
    setIsLoading(true)
    try {
      const res = await mockService.login(email, pass)
      setUser(res.user)
      setFamily(res.family)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: any) => {
    setIsLoading(true)
    try {
      const res = await mockService.register(data)
      setUser(res.user)
      setFamily(res.family)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setFamily(null)
  }

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = await mockService.updatePreferences(newPrefs)
    setPreferences({ ...updated })
  }

  const generateInviteCode = async () => {
    const code = await mockService.generateInviteCode()
    if (family) {
      setFamily({ ...family, inviteCode: code })
    }
    return code
  }

  const deleteAccount = async () => {
    setIsLoading(true)
    try {
      await mockService.deleteAccount()
      setUser(null)
      setFamily(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MockAuthContext.Provider
      value={{
        user,
        family,
        bills,
        preferences,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updatePreferences,
        generateInviteCode,
        deleteAccount,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  )
}
