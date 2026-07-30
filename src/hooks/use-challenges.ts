import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getChallengesByFamilyId,
  createChallenge as createChallengeSvc,
  updateChallenge,
} from '@/services/challenges'
import type { ChallengeRecord, ChallengeType, BadgeType } from '@/types/finance'
import { getBadgeFromPoints, type PredefinedChallenge } from '@/lib/wellness-constants'

export interface ChallengesSummary {
  totalPoints: number
  currentBadge: ReturnType<typeof getBadgeFromPoints>
  activeChallenges: ChallengeRecord[]
  completedChallenges: ChallengeRecord[]
}

export function useChallenges(memberId: string | undefined, familyId: string | undefined) {
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setChallenges([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getChallengesByFamilyId(familyId)
      setChallenges(data)
    } catch {
      setError('Erro ao carregar desafios')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('challenges', () => {
    loadData()
  })

  const summary = useMemo<ChallengesSummary>(() => {
    const mine = challenges.filter((c) => c.user_id === memberId)
    const completed = mine.filter((c) => c.status === 'completed')
    const totalPoints = completed.reduce((s, c) => s + (c.points || 0), 0)
    const active = mine.filter((c) => c.status === 'active')
    const allCompleted = challenges.filter((c) => c.status === 'completed')
    return {
      totalPoints,
      currentBadge: getBadgeFromPoints(totalPoints),
      activeChallenges: active,
      completedChallenges: allCompleted,
    }
  }, [challenges, memberId])

  const addProgress = useCallback(
    async (
      challengeId: string,
      increment: number,
    ): Promise<{ completed: boolean; failed: boolean; points: number }> => {
      const challenge = challenges.find((c) => c.id === challengeId)
      if (!challenge) return { completed: false, failed: false, points: 0 }
      const newValue = (challenge.current_value || 0) + increment
      const isComplete =
        challenge.target_value !== null &&
        challenge.target_value !== undefined &&
        newValue >= challenge.target_value
      await updateChallenge(challengeId, {
        current_value: newValue,
        status: isComplete ? 'completed' : 'active',
      })
      loadData()
      return { completed: isComplete, failed: false, points: isComplete ? challenge.points : 0 }
    },
    [challenges, loadData],
  )

  const createChallenge = useCallback(
    async (preset: PredefinedChallenge) => {
      if (!familyId || !memberId) return
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + preset.durationDays * 86400000)
        .toISOString()
        .split('T')[0]
      await createChallengeSvc({
        family_id: familyId,
        user_id: memberId,
        type: preset.type,
        title: preset.title,
        description: preset.description,
        target_value: preset.targetValue,
        current_value: 0,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        points: preset.points,
        badge_type: preset.badgeType,
      })
      loadData()
    },
    [familyId, memberId, loadData],
  )

  const createCustomChallenge = useCallback(
    async (data: {
      title: string
      description: string
      targetValue: number | null
      durationDays: number
    }) => {
      if (!familyId || !memberId) return
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + data.durationDays * 86400000)
        .toISOString()
        .split('T')[0]
      await createChallengeSvc({
        family_id: familyId,
        user_id: memberId,
        type: 'custom',
        title: data.title,
        description: data.description,
        target_value: data.targetValue,
        current_value: 0,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        points: 50,
        badge_type: 'bronze',
      })
      loadData()
    },
    [familyId, memberId, loadData],
  )

  return {
    challenges,
    summary,
    loading,
    error,
    refetch: loadData,
    addProgress,
    createChallenge,
    createCustomChallenge,
  }
}
