import pb from '@/lib/pocketbase/client'
import type { AIInsight } from '@/types/finance'

export interface ChatContextMessage {
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

export interface FinancialActionResponse {
  success: boolean
  executable: boolean
  action?: 'create_challenge' | 'create_task'
  params?: Record<string, unknown>
  summary?: string
  response?: string // quando executable=false
  error?: string
}

export interface ConfirmActionResponse {
  success: boolean
  created?: { id: string; [key: string]: unknown }
  message?: string
  error?: string
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

export const executeAction = (
  familyId: string,
  memberId: string,
  message: string,
  context?: ChatContextMessage[],
): Promise<FinancialActionResponse | AdvisorErrorResponse> =>
  pb.send('/backend/v1/financial-actions', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      user_id: memberId,
      message,
      context: context || [],
    }),
    headers: { 'Content-Type': 'application/json' },
  })

export const confirmAction = (
  action: string,
  params: Record<string, unknown>,
  familyId: string,
  memberId: string,
): Promise<ConfirmActionResponse> =>
  pb.send('/backend/v1/financial-actions/confirm', {
    method: 'POST',
    body: JSON.stringify({
      action,
      params,
      family_id: familyId,
      user_id: memberId,
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
