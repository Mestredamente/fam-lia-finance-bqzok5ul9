import { INITIAL_USER, INITIAL_FAMILY, INITIAL_FIXED_BILLS, INITIAL_PREFERENCES } from './data'
import { UserProfile, Family, FixedBill, UserPreferences, UserRole } from '@/types/finance'

const delay = (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms))

let currentUserState: UserProfile | null = INITIAL_USER
let currentFamilyState: Family | null = INITIAL_FAMILY
let currentBillsState: FixedBill[] = [...INITIAL_FIXED_BILLS]
let currentPrefsState: UserPreferences = { ...INITIAL_PREFERENCES }

export const mockService = {
  async login(email: string, pass: string): Promise<{ user: UserProfile; family: Family }> {
    await delay(800)
    if (email.toLowerCase() === 'erro@email.com' || pass === 'wrongpass') {
      throw new Error('E-mail ou senha incorretos')
    }
    currentUserState = { ...INITIAL_USER, email }
    currentFamilyState = { ...INITIAL_FAMILY }
    return { user: currentUserState, family: currentFamilyState }
  },

  async register(data: {
    name: string
    email: string
    role: UserRole
    familyName?: string
    monthlyIncome: number
    payDay: number
    dueNotifications: boolean
    aiTips: boolean
  }): Promise<{ user: UserProfile; family: Family }> {
    await delay(800)
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      monthlyIncome: data.monthlyIncome,
      payDay: data.payDay,
      totalInvested: 0,
      totalDebts: 0,
    }
    const newFamily: Family = {
      id: `fam_${Date.now()}`,
      name: data.familyName || 'Família ' + data.name.split(' ')[0],
      inviteCode: 'FAM-' + Math.floor(1000 + Math.random() * 9000),
      members: [
        {
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          joined: true,
          income: newUser.monthlyIncome,
          expenses: 0,
        },
      ],
    }
    currentUserState = newUser
    currentFamilyState = newFamily
    currentPrefsState = {
      dueNotifications: data.dueNotifications,
      aiTips: data.aiTips,
      shareDataWithSpouse: true,
    }
    return { user: newUser, family: newFamily }
  },

  async validateInviteCode(
    code: string,
  ): Promise<{ valid: boolean; familyName?: string; inviterName?: string }> {
    await delay(600)
    if (code.trim().toUpperCase() === 'FAM-1234') {
      return { valid: true, familyName: 'Família Silva', inviterName: 'Ana Silva' }
    }
    return { valid: false }
  },

  async updatePreferences(newPrefs: Partial<UserPreferences>): Promise<UserPreferences> {
    await delay(400)
    currentPrefsState = { ...currentPrefsState, ...newPrefs }
    return currentPrefsState
  },

  async generateInviteCode(): Promise<string> {
    await delay(500)
    const code = 'FAM-XY' + Math.floor(10 + Math.random() * 89)
    if (currentFamilyState) {
      currentFamilyState.inviteCode = code
    }
    return code
  },

  async deleteAccount(): Promise<void> {
    await delay(800)
    currentUserState = null
    currentFamilyState = null
  },

  getInitialState() {
    return {
      user: currentUserState,
      family: currentFamilyState,
      bills: currentBillsState,
      preferences: currentPrefsState,
    }
  },
}
