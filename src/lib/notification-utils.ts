export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  )
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!notificationsSupported()) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function sendNotification(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/icon.svg', badge: '/icon.svg', tag: title })
  } catch {
    // noop
  }
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

export function hasNotificationBeenSent(key: string): boolean {
  try {
    return localStorage.getItem(`ff_notif_${key}`) === '1'
  } catch {
    return false
  }
}

export function markNotificationSent(key: string): void {
  try {
    localStorage.setItem(`ff_notif_${key}`, '1')
  } catch {
    // noop
  }
}
