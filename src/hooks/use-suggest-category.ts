import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import type { TransactionRecord } from '@/types/finance'

export interface CategorySuggestion {
  categoryId: string | null
  confidence: number
  matchCount: number
}

/**
 * Suggests a category for a description by looking up the family's past
 * transactions with a similar description.
 *
 * Confidence rule (per the spec): we only return a suggestion when there are
 * at least 3 past transactions with the SAME description AND the SAME category.
 * Confidence is matchCount / (matchCount + 1) so 3 matches → 0.75 (> 0.7).
 *
 * The user can opt out for the current form session — see the `disabled` flag
 * passed in by the caller when the user picks a category themselves.
 */
export function useSuggestCategory(
  description: string,
  familyId: string | undefined,
  enabled: boolean = true,
): CategorySuggestion {
  const [suggestion, setSuggestion] = useState<CategorySuggestion>({
    categoryId: null,
    confidence: 0,
    matchCount: 0,
  })

  useEffect(() => {
    const trimmed = description.trim()
    if (!enabled || !familyId || trimmed.length < 3) {
      setSuggestion({ categoryId: null, confidence: 0, matchCount: 0 })
      return
    }
    const handle = setTimeout(async () => {
      try {
        // ILIKE is not available in the PocketBase filter — use `~` (contains)
        // which is case-insensitive in SQLite. We fetch a bounded window of
        // candidate transactions (description contains the typed text) and
        // tally category frequencies client-side.
        const escaped = trimmed.replace(/"/g, '\\"')
        const rows = await pb.collection('transactions').getFullList<TransactionRecord>({
          filter: `family_id = "${familyId}" && description ~ "${escaped}"`,
          fields: 'category_id,description',
          sort: '-created',
          // limit the candidate set for performance — we only need enough
          // to evaluate the ≥3 match rule.
        })
        // Consider only transactions whose description matches case-insensitively
        // AND is "similar enough" (exact match on the trimmed description, or a
        // superstring where the typed text is ≥ 60% of the stored description).
        const lower = trimmed.toLowerCase()
        const counts = new Map<string, number>()
        for (const r of rows) {
          if (!r.category_id) continue
          const d = (r.description || '').toLowerCase()
          const isExact = d === lower
          const isSuper = d.includes(lower) && lower.length / d.length >= 0.6
          if (!isExact && !isSuper) continue
          counts.set(r.category_id, (counts.get(r.category_id) || 0) + 1)
        }
        let bestId: string | null = null
        let bestCount = 0
        for (const [id, n] of counts) {
          if (n > bestCount) {
            bestId = id
            bestCount = n
          }
        }
        if (bestId && bestCount >= 3) {
          const confidence = bestCount / (bestCount + 1)
          setSuggestion({ categoryId: bestId, confidence, matchCount: bestCount })
        } else {
          setSuggestion({ categoryId: null, confidence: 0, matchCount: 0 })
        }
      } catch {
        setSuggestion({ categoryId: null, confidence: 0, matchCount: 0 })
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [description, familyId, enabled])

  return suggestion
}
