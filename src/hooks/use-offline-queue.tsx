import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { toast } from '@/hooks/use-toast'

interface QueuedAction {
  id: string
  label: string
  execute: () => Promise<void>
}

interface OfflineQueueContextType {
  isOnline: boolean
  queueAction: (label: string, execute: () => Promise<void>) => void
  pendingCount: number
}

const OfflineQueueContext = createContext<OfflineQueueContextType | undefined>(undefined)

export function useOfflineQueue() {
  const ctx = useContext(OfflineQueueContext)
  if (!ctx) throw new Error('useOfflineQueue must be used within OfflineQueueProvider')
  return ctx
}

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState<QueuedAction[]>([])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (queue.length === 0) return
    for (const action of queue) {
      try {
        await action.execute()
      } catch {
        /* skip failed */
      }
    }
    setQueue([])
    toast({ title: 'Sincronizado', description: 'Todas as ações foram processadas.' })
  }, [queue])

  useEffect(() => {
    if (isOnline && queue.length > 0) processQueue()
  }, [isOnline, queue, processQueue])

  const queueAction = useCallback((label: string, execute: () => Promise<void>) => {
    if (navigator.onLine) {
      execute()
    } else {
      setQueue((prev) => [...prev, { id: Date.now().toString(), label, execute }])
      toast({
        title: 'Você está offline',
        description: 'A ação será sincronizada quando voltar online.',
      })
    }
  }, [])

  return (
    <OfflineQueueContext.Provider value={{ isOnline, queueAction, pendingCount: queue.length }}>
      {children}
    </OfflineQueueContext.Provider>
  )
}
