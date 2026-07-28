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
    return await pb
      .collection('family_invites')
      .getFirstListItem<InviteRecord>(
        `invite_code = "${code}" && used_by = null && expires_at > @now`,
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
}) => pb.collection('family_invites').create<InviteRecord>(data)

export const markInviteUsed = (id: string, usedBy: string) =>
  pb.collection('family_invites').update<InviteRecord>(id, {
    used_by: usedBy,
    used_at: new Date().toISOString(),
  })
