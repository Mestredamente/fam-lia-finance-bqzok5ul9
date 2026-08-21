import { useState, useEffect } from 'react'

export interface AppNotification {
  id: string
  title: string
  description: string
  timestamp: number
  read: boolean
  iconColor?: string
  link?: string
  type?: string
  actionLabel?: string
  priority?: 'high' | 'medium' | 'low'
  amount?: number
  metadata?: Record<string, any> | null
}

const STORAGE_KEY = 'ff_notifications'
const MAX_NOTIFICATIONS = 50

let notifications: AppNotification[] = loadNotifications()
const listeners = new Set<() => void>()

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)))
  } catch {
    /* intentionally ignored */
  }
}

function emit() {
  listeners.forEach((l) => l())
}

export function addNotification(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & {
    id?: string
    timestamp?: number
    read?: boolean
  },
) {
  const finalId = notif.id || Date.now().toString() + Math.random().toString(36).slice(2)
  if (notifications.some((n) => n.id === finalId)) {
    return
  }
  notifications = [
    {
      ...notif,
      id: finalId,
      timestamp: notif.timestamp ?? Date.now(),
      read: notif.read ?? false,
    },
    ...notifications,
  ].slice(0, MAX_NOTIFICATIONS)
  save()
  emit()
}

export function markAllRead(familyId?: unknown) {
  notifications = notifications.map((n) => ({ ...n, read: true }))
  save()
  emit()
  if (typeof familyId === 'string' && familyId) {
    import('@/services/notifications').then(({ markAllNotificationsAsRead }) => {
      markAllNotificationsAsRead(familyId).catch(() => {})
    })
  }
}

export function markAsRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  save()
  emit()
  import('@/services/notifications').then(({ markNotificationAsRead }) => {
    markNotificationAsRead(id).catch(() => {})
  })
}

export function dismissNotification(id: string) {
  notifications = notifications.filter((n) => n.id !== id)
  save()
  emit()
}

export function clearNotifications() {
  notifications = []
  save()
  emit()
}

export function useNotificationsStore() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  const unreadCount = notifications.filter((n) => !n.read).length
  return {
    notifications,
    unreadCount,
    markAllRead,
    markAsRead,
    clearNotifications,
    addNotification,
    dismissNotification,
  }
}

export default useNotificationsStore
