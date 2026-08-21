import pb from '@/lib/pocketbase/client'
import type { NotificationServerRecord } from '@/types/finance'

export async function getNotificationsByFamilyId(
  familyId: string,
): Promise<NotificationServerRecord[]> {
  try {
    return await pb.collection('notifications').getFullList<NotificationServerRecord>({
      filter: `family_id = "${familyId}"`,
      sort: '-created',
    })
  } catch {
    return []
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await pb.collection('notifications').update(id, { is_read: true })
  } catch {
    /* ignore error */
  }
}

export async function markAllNotificationsAsRead(familyId: string): Promise<void> {
  try {
    const unread = await pb.collection('notifications').getFullList<NotificationServerRecord>({
      filter: `family_id = "${familyId}" && is_read = false`,
    })
    await Promise.allSettled(
      unread.map((n) => pb.collection('notifications').update(n.id, { is_read: true })),
    )
  } catch {
    /* ignore */
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await pb.collection('notifications').delete(id)
  } catch {
    /* ignore */
  }
}
