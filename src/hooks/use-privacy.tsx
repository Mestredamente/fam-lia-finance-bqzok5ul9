import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { formatBRL as baseFormatBRL } from '@/lib/utils'

interface PrivacyContextType {
  privacyMode: boolean
  togglePrivacyMode: () => void
  setPrivacyMode: (value: boolean) => void
  formatCurrency: (val: number | null | undefined) => string
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined)

const PRIVACY_STORAGE_KEY = 'ff_privacy_mode'
export const PRIVACY_MASK = 'R$ ••••••••'

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(PRIVACY_STORAGE_KEY)
      return stored ? JSON.parse(stored) === true : false
    } catch {
      return false
    }
  })

  const setPrivacyMode = useCallback((val: boolean) => {
    setPrivacyModeState(val)
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(val))
    } catch {
      /* ignore */
    }
  }, [])

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const formatCurrency = useCallback(
    (val: number | null | undefined): string => {
      if (privacyMode) {
        return PRIVACY_MASK
      }
      return baseFormatBRL(val)
    },
    [privacyMode],
  )

  useEffect(() => {
    // Keep in sync across tabs or storage changes if any
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PRIVACY_STORAGE_KEY && e.newValue !== null) {
        try {
          setPrivacyModeState(JSON.parse(e.newValue) === true)
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <PrivacyContext.Provider
      value={{
        privacyMode,
        togglePrivacyMode,
        setPrivacyMode,
        formatCurrency,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider')
  }
  return context
}

export function useFormatCurrency() {
  const { formatCurrency, privacyMode } = usePrivacy()
  return { formatCurrency, privacyMode }
}

export function PrivacyAmount({
  value,
  className,
}: {
  value: number | null | undefined
  className?: string
}) {
  const { formatCurrency } = usePrivacy()
  return <span className={className}>{formatCurrency(value)}</span>
}
