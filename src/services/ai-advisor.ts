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
