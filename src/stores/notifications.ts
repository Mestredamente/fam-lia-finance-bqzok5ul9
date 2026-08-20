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

export function addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
  notifications = [
    {
      ...notif,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      read: false,
    },
    ...notifications,
  ].slice(0, MAX_NOTIFICATIONS)
  save()
  emit()
}

export function markAllRead() {
  notifications = notifications.map((n) => ({ ...n, read: true }))
  save()
  emit()
}

export function markAsRead(id: string) {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
  save()
  emit()
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
