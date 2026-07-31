import { useState, useEffect } from 'react'

export interface AppNotification {
  id: string
  title: string
  description: string
  timestamp: number
  read: boolean
  iconColor?: string
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
  return { notifications, unreadCount, markAllRead, clearNotifications, addNotification }
}

export default useNotificationsStore
