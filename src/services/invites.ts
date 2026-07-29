import { ClientResponseError } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import type { InviteRecord } from '@/types/finance'

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'FAM-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export interface InviteValidationResult {
  valid: boolean
  family_name?: string
  creator_name?: string
  error?: string
}

export const validateInviteCode = async (code: string): Promise<InviteValidationResult> => {
  try {
    const normalizedCode = code.trim().toUpperCase()
    const result = await pb.send(
      `/backend/v1/validate-invite-code?invite_code=${encodeURIComponent(normalizedCode)}`,
      { method: 'GET' },
    )
    return result as InviteValidationResult
  } catch (err: unknown) {
    if (err instanceof ClientResponseError) {
      if (err.status === 0 || err.isAbort) {
        return {
          valid: false,
          error: 'Erro de conexão. Verifique sua internet e tente novamente.',
        }
      }
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const d = data as { valid?: boolean; error?: string }
        if (d.valid === false && d.error) {
          return { valid: false, error: d.error }
        }
      }
    }
    if (err instanceof Error) {
      const msg = err.message.toLowerCase()
      if (
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('connection')
      ) {
        return {
          valid: false,
          error: 'Erro de conexão. Verifique sua internet e tente novamente.',
        }
      }
    }
    console.error('validateInviteCode error:', err)
    return { valid: false, error: 'Erro inesperado. Tente novamente.' }
  }
}

export interface JoinFamilyResult {
  valid: boolean
  family_name?: string
  error?: string
}

export const joinFamily = (data: {
  invite_code: string
  user_id: string
  role: string
  display_name: string
  email: string
  monthly_income?: number
  payday?: number
  notify_bills?: boolean
  notify_ai_tips?: boolean
  share_data?: boolean
}): Promise<JoinFamilyResult> =>
  pb.send('/backend/v1/join-family', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

export const createInvite = (data: {
  family_id: string
  invite_code: string
  created_by: string
  expires_at: string
}) =>
  pb.collection('family_invites').create<InviteRecord>({
    family_id: data.family_id,
    invite_code: data.invite_code,
    created_by: data.created_by,
    expires_at: data.expires_at,
  })
