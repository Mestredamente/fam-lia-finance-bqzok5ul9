import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

const RECONNECT_DELAY = 2000
const MAX_CONSECUTIVE_FAILURES = 3
const TOKEN_CHECK_INTERVAL = 30 * 1000

export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined
    let tokenCheckInterval: ReturnType<typeof setInterval> | undefined
    let consecutiveFailures = 0

    const ensureValidToken = async (): Promise<boolean> => {
      if (pb.authStore.isValid) return true
      try {
        await pb.collection('users').authRefresh()
        return pb.authStore.isValid
      } catch (err) {
        console.error(`[useRealtime] Token refresh failed for "${collectionName}":`, err)
        return false
      }
    }

    const teardownCurrent = async () => {
      if (unsubscribeFn) {
        const fn = unsubscribeFn
        unsubscribeFn = undefined
        try {
          await fn()
        } catch {
          // ignore teardown errors
        }
      }
    }

    const attemptSubscribe = async () => {
      if (cancelled) return

      const tokenValid = await ensureValidToken()
      if (!tokenValid || cancelled) return

      try {
        const fn = await pb.collection<TRecord>(collectionName).subscribe('*', (e) => {
          callbackRef.current(e)
        })
        if (cancelled) {
          fn().catch(() => {})
        } else {
          unsubscribeFn = fn
          consecutiveFailures = 0
        }
      } catch (err) {
        console.error(`[useRealtime] Subscription to "${collectionName}" failed:`, err)

        await teardownCurrent()

        consecutiveFailures++

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          toast({
            title: 'Conexão em tempo real indisponível. Recarregue a página se persistir.',
          })
        }

        if (!cancelled) {
          reconnectTimeout = setTimeout(() => {
            attemptSubscribe()
          }, RECONNECT_DELAY)
        }
      }
    }

    const checkTokenValidity = async () => {
      if (cancelled) return

      if (!pb.authStore.isValid) {
        await teardownCurrent()

        const refreshed = await ensureValidToken()
        if (refreshed && !cancelled) {
          consecutiveFailures = 0
          attemptSubscribe()
        }
      }
    }

    tokenCheckInterval = setInterval(checkTokenValidity, TOKEN_CHECK_INTERVAL)

    attemptSubscribe()

    return () => {
      cancelled = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (tokenCheckInterval) clearInterval(tokenCheckInterval)
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
