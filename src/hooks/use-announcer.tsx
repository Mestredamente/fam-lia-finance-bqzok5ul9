import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AnnouncerContextType {
  announce: (message: string, type?: 'polite' | 'assertive') => void
}

const AnnouncerContext = createContext<AnnouncerContextType | undefined>(undefined)

export function useAnnouncer() {
  const ctx = useContext(AnnouncerContext)
  if (!ctx) throw new Error('useAnnouncer must be used within AnnouncerProvider')
  return ctx
}

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  const announce = useCallback((message: string, type: 'polite' | 'assertive' = 'polite') => {
    if (type === 'assertive') {
      setAssertiveMessage('')
      setTimeout(() => setAssertiveMessage(message), 50)
    } else {
      setPoliteMessage('')
      setTimeout(() => setPoliteMessage(message), 50)
    }
  }, [])

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  )
}
