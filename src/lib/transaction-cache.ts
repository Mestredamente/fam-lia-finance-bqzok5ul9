import type { TransactionRecord } from '@/types/finance'

/**
 * localStorage-backed cache of the most recently loaded transactions for a
 * family/month/member. Used to keep the dashboard populated when the app goes
 * offline — the service worker never caches API responses, so this is the app's
 * own data cache. Best-effort: any read/write error is swallowed.
 */

const CACHE_PREFIX = 'ff_tx_cache_v1:'

function key(familyId: string, year: number, month: number, memberId?: string) {
  return `${CACHE_PREFIX}${familyId}:${year}:${month}:${memberId || 'all'}`
}

export function getCachedTransactions(
  familyId: string,
  year: number,
  month: number,
  memberId?: string,
): TransactionRecord[] {
  try {
    const raw = localStorage.getItem(key(familyId, year, month, memberId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as TransactionRecord[]) : []
  } catch {
    return []
  }
}

export function setCachedTransactions(
  familyId: string,
  year: number,
  month: number,
  memberId: string | undefined,
  data: TransactionRecord[],
) {
  try {
    localStorage.setItem(key(familyId, year, month, memberId), JSON.stringify(data))
  } catch {
    /* storage full / unavailable — best effort */
  }
}

/** Clear every cached transaction payload (e.g. on logout). */
export function clearCachedTransactions() {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_PREFIX)) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
