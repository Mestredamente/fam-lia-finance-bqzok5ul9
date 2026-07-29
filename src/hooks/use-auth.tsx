import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import type { AuthUser, FamilyRecord, MemberRecord } from '@/types/finance'
import {
  getMemberByUserId,
  updateMember as updateMemberSvc,
  deleteMember as deleteMemberSvc,
} from '@/services/members'
import { getFamily } from '@/services/families'

interface AuthContextType {
  user: AuthUser | null
  member: MemberRecord | null
  family: FamilyRecord | null
  isAuthenticated: boolean
  hasFamily: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ hasFamily: boolean }>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => void
  refreshData: () => Promise<void>
  updateMemberData: (data: Partial<MemberRecord>) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(
    pb.authStore.isValid ? (pb.authStore.record as unknown as AuthUser) : null,
  )
  const [member, setMember] = useState<MemberRecord | null>(null)
  const [family, setFamily] = useState<FamilyRecord | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const memberRecord = await getMemberByUserId(userId)
      setMember(memberRecord)
      if (memberRecord.family_id) {
        const familyRecord = await getFamily(memberRecord.family_id)
        setFamily(familyRecord)
      }
    } catch {
      setMember(null)
      setFamily(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      const isValid = pb.authStore.isValid
      setIsAuthenticated(isValid)
      setUser(isValid ? (record as unknown as AuthUser) : null)
      if (!isValid) {
        setMember(null)
        setFamily(null)
      }
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then(async () => {
          const record = pb.authStore.record
          if (record) {
            setUser(record as unknown as AuthUser)
            await loadUserData(record.id)
          }
        })
        .catch(() => {
          pb.authStore.clear()
        })
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [loadUserData])

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    setUser(authData.record as unknown as AuthUser)
    try {
      const memberRecord = await getMemberByUserId(authData.record.id)
      setMember(memberRecord)
      if (memberRecord.family_id) {
        const familyRecord = await getFamily(memberRecord.family_id)
        setFamily(familyRecord)
      }
      return { hasFamily: true }
    } catch {
      setMember(null)
      setFamily(null)
      return { hasFamily: false }
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    await pb.collection('users').create({ email, password, passwordConfirm: password, name })
    await pb.collection('users').authWithPassword(email, password)
    setUser(pb.authStore.record as unknown as AuthUser)
    setMember(null)
    setFamily(null)
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
    setMember(null)
    setFamily(null)
  }

  const refreshData = useCallback(async () => {
    if (pb.authStore.record) {
      await loadUserData(pb.authStore.record.id)
    }
  }, [loadUserData])

  const updateMemberData = useCallback(
    async (data: Partial<MemberRecord>) => {
      if (!member) return
      const prevMember = member
      setMember({ ...member, ...data })
      try {
        const updated = await updateMemberSvc(member.id, data)
        setMember(updated)
      } catch (err) {
        setMember(prevMember)
        throw err
      }
    },
    [member],
  )

  const deleteAccount = useCallback(async () => {
    if (!member || !user) return
    await deleteMemberSvc(member.id)
    await pb.collection('users').delete(user.id)
    signOut()
  }, [member, user])

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        family,
        isAuthenticated,
        hasFamily: !!member,
        loading,
        login,
        signUp,
        signOut,
        refreshData,
        updateMemberData,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
