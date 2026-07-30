import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getJournalEntries } from '@/services/emotional-journal'
import type { EmotionalJournalRecord, EmotionType } from '@/types/finance'
import { getEmotionMeta } from '@/lib/wellness-constants'

export interface JournalSummary {
  emotionCount: Record<string, number>
  topEmotion: EmotionType | null
  totalSpent: number
  entryCount: number
}

export function useEmotionalJournal(memberId: string | undefined, month?: number, year?: number) {
  const [entries, setEntries] = useState<EmotionalJournalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!memberId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getJournalEntries(memberId, month, year)
      setEntries(data)
    } catch {
      setError('Erro ao carregar diário emocional')
    } finally {
      setLoading(false)
    }
  }, [memberId, month, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('emotional_journal', () => {
    loadData()
  })

  const summary = useMemo<JournalSummary>(() => {
    const emotionCount: Record<string, number> = {}
    let totalSpent = 0
    for (const entry of entries) {
      emotionCount[entry.emotion] = (emotionCount[entry.emotion] || 0) + 1
      totalSpent += entry.spending_amount || 0
    }
    let topEmotion: EmotionType | null = null
    let maxCount = 0
    for (const [emotion, count] of Object.entries(emotionCount)) {
      if (count > maxCount) {
        maxCount = count
        topEmotion = emotion as EmotionType
      }
    }
    return { emotionCount, topEmotion, totalSpent, entryCount: entries.length }
  }, [entries])

  return { entries, summary, loading, error, refetch: loadData }
}
