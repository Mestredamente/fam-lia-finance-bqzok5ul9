import { useContext } from 'react'
import { MockAuthContext } from '@/context/mock-auth-context'

export function useMockAuth() {
  const context = useContext(MockAuthContext)
  if (!context) {
    throw new Error('useMockAuth must be used within a MockAuthProvider')
  }
  return context
}
