import pb from '@/lib/pocketbase/client'
import type { AIInsight } from '@/types/finance'

interface ChatContextMessage {
  role: string
  content: string
}

export interface InsightsResponse {
  success: boolean
  insights: AIInsight[]
}

export interface ChatResponse {
  success: boolean
  response: string
}

export interface AdvisorErrorResponse {
  error: string
}

export const getInsights = (
  familyId: string,
  memberId: string,
): Promise<InsightsResponse | AdvisorErrorResponse> =>
  pb.send('/backend/v1/financial-advisor', {
    method: 'POST',
    body: JSON.stringify({ family_id: familyId, user_id: memberId, type: 'insights' }),
    headers: { 'Content-Type': 'application/json' },
  })

export const chat = (
  familyId: string,
  memberId: string,
  message: string,
  context?: ChatContextMessage[],
): Promise<ChatResponse | AdvisorErrorResponse> =>
  pb.send('/backend/v1/financial-advisor', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      user_id: memberId,
      type: 'chat',
      message,
      context: context || [],
    }),
    headers: { 'Content-Type': 'application/json' },
  })

export interface EmotionalInsightsContext {
  month: number
  year: number
  total_transactions_with_emotion: number
  total_emotional_spending: number
  breakdown: Record<string, { total: number; count: number; top_category: string | null }>
  dominant_emotion: string | null
  dominant_pct: number
  is_dominant: boolean
  temporal: {
    time_available: boolean
    peak: { emotion: string; weekday: string; period: string; total: number } | null
    concentration: { emotion: string; period: string; pct: number; total: number } | null
    no_late_night_spending: boolean
    heatmap_has_data: boolean
  }
}

export const getEmotionalInsights = (
  familyId: string,
  memberId: string,
  context: EmotionalInsightsContext,
): Promise<InsightsResponse | AdvisorErrorResponse> =>
  pb.send('/backend/v1/financial-advisor', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      user_id: memberId,
      type: 'emotional_insights',
      context,
    }),
    headers: { 'Content-Type': 'application/json' },
  })
