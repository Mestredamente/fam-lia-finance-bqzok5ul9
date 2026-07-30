import pb from '@/lib/pocketbase/client'
import type { EmotionalAnalysisResult } from '@/types/finance'

export interface AnalysisResponse {
  success: boolean
  analysis: EmotionalAnalysisResult
}

export interface AnalysisErrorResponse {
  error: string
}

export const getEmotionalAnalysis = (
  familyId: string,
  memberId: string,
): Promise<AnalysisResponse | AnalysisErrorResponse> =>
  pb.send('/backend/v1/emotional-analysis', {
    method: 'POST',
    body: JSON.stringify({ family_id: familyId, user_id: memberId }),
    headers: { 'Content-Type': 'application/json' },
  })
