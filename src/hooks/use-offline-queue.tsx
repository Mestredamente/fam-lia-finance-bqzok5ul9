import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { toast } from '@/hooks/use-toast'
import { createTransaction } from '@/services/transactions'
import type { TransactionRecord } from '@/types/finance'

/**
 * Offline transaction queue.
 *
 * When the user creates a transaction while offline, it is persisted to
 * localStorage (so it survives reloads) and surfaced to the UI as a "pending"
 * transaction via `pendingTransactions`. The sync runs:
 *  - automatically when the browser fires the `online` event, or
 *  - when the service worker posts `ff-flush-offline-queue` (Background Sync), or
 *  - on mount if the app starts online with a non-empty queue.
 *
 * API calls (PocketBase) are never cached by the service worker — only the
 * queue keeps writes for later replay.
 */

const QUEUE_KEY = 'ff_offline_transaction_queue'

/** The shape of a queued (not-yet-synced) transaction. */
export interface PendingTransaction {
  /** Local-only id (uuid-ish). Prefixed so the UI can detect pending rows. */
  tempId: string
  /** The payload that will be sent to PocketBase on sync. */
  data: Partial<TransactionRecord>
  /** ISO timestamp of when it was queued, for ordering / display. */
  queuedAt: string
}

interface OfflineQueueContextType {
  isOnline: boolean
  pendingTransactions: PendingTransaction[]
  pendingCount: number
  /** Queue a transaction for later sync (used when offline). */
  enqueueTransaction: (data: Partial<TransactionRecord>) => PendingTransaction
  /** Remove a pending transaction from the queue (e.g. user undid it). */
  removePending: (tempId: string) => void
  /** Force a sync attempt now. Safe to call online. */
  flush: () => Promise<void>
  /** True while a sync is running. */
  syncing: boolean
}

const OfflineQueueContext = createContext<OfflineQueueContextType | undefined>(undefined)

export function useOfflineQueue() {
  const ctx = useContext(OfflineQueueContext)
  if (!ctx) throw new Error('useOfflineQueue must be used within OfflineQueueProvider')
  return ctx
}

function readQueue(): PendingTransaction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items: PendingTransaction[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch {
    /* storage full / unavailable — best effort */
  }
}

function genTempId() {
  return 'pending-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>(() =>
    typeof window === 'undefined' ? [] : readQueue(),
  )
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  // Keep localStorage in sync with state.
  useEffect(() => {
    writeQueue(pendingTransactions)
  }, [pendingTransactions])

  const flush = useCallback(async () => {
    if (syncingRef.current) return
    const queue = readQueue()
    if (queue.length === 0) return
    if (!navigator.onLine) return
    syncingRef.current = true
    setSyncing(true)
    let synced = 0
    const remaining: PendingTransaction[] = []
    for (const item of queue) {
      try {
        await createTransaction(item.data)
        synced++
      } catch {
        // Keep the item for a later retry.
        remaining.push(item)
      }
    }
    setPendingTransactions(remaining)
    syncingRef.current = false
    setSyncing(false)
    if (synced > 0) {
      toast({
        title: 'Transações sincronizadas',
        description: `${synced} transação(ões) enviada(s) com sucesso.`,
      })
      // Let listeners (dashboard / transactions page) reload fresh data.
      window.dispatchEvent(new CustomEvent('ff-offline-synced', { detail: { synced } }))
    }
  }, [])

  const enqueueTransaction = useCallback((data: Partial<TransactionRecord>): PendingTransaction => {
    const item: PendingTransaction = {
      tempId: genTempId(),
      data,
      queuedAt: new Date().toISOString(),
    }
    setPendingTransactions((prev) => [...prev, item])
    toast({
      title: 'Transação salva offline',
      description: 'Será sincronizada quando a internet voltar.',
    })
    // Best-effort: register a Background Sync tag so the service worker
    // fires 'sync' (and pings clients) the moment connectivity returns.
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg) =>
          (
            reg as ServiceWorkerRegistration & {
              sync?: { register: (tag: string) => Promise<void> }
            }
          ).sync?.register('sync-transactions'),
        )
      }
    } catch {
      /* Background Sync not supported — the online event still flushes */
    }
    return item
  }, [])

  const removePending = useCallback((tempId: string) => {
    setPendingTransactions((prev) => prev.filter((p) => p.tempId !== tempId))
  }, [])

  // Track online/offline.
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Fire-and-forget; flush checks navigator.onLine itself.
      flush()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flush])

  // Background Sync trigger from the service worker.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ff-flush-offline-queue') flush()
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onMessage)
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMessage)
      }
    }
  }, [flush])

  // On mount: if online with pending items, try to flush.
  useEffect(() => {
    if (navigator.onLine && readQueue().length > 0) flush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <OfflineQueueContext.Provider
      value={{
        isOnline,
        pendingTransactions,
        pendingCount: pendingTransactions.length,
        enqueueTransaction,
        removePending,
        flush,
        syncing,
      }}
    >
      {children}
    </OfflineQueueContext.Provider>
  )
}
