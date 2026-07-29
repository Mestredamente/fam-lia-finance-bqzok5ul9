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

export const validateInviteCode = async (code: string): Promise<InviteRecord | null> => {
  try {
    const normalizedCode = code.trim().toUpperCase()
    return await pb
      .collection('family_invites')
      .getFirstListItem<InviteRecord>(
        `invite_code = "${normalizedCode}" && used_by = null && expires_at > @now`,
        { expand: 'family_id' },
      )
  } catch {
    return null
  }
}

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

export const markInviteUsed = (id: string, usedBy: string) =>
  pb.collection('family_invites').update<InviteRecord>(id, {
    used_by: usedBy,
    used_at: new Date().toISOString(),
  })
