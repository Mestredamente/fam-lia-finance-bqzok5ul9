import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useContasAPagar } from '@/hooks/use-contas-a-pagar'
import { generateBillAlerts } from '@/services/bill-alerts'
import { addNotification, useNotificationsStore } from '@/stores/notifications'
import { formatBRL } from '@/lib/utils'

export function useBillNotifications(enabled: boolean = true) {
  const { family } = useAuth()
  const { contas, refetch } = useContasAPagar(enabled && family ? family.id : undefined)
  const { notifications } = useNotificationsStore()
  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  const syncBillNotifications = useCallback(() => {
    if (!enabled || !family || contas.length === 0) return

    const alerts = generateBillAlerts(contas)
    const currentNotifications = notificationsRef.current
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    for (const alert of alerts) {
      for (const account of alert.accounts) {
        const formattedAmount = formatBRL(account.amount)
        const description = `${account.description} - ${formattedAmount}`

        // Dedup: check if a notification with the same description already exists
        const exists = currentNotifications.some((n) => n.description === description)
        if (exists) continue

        if (alert.type === 'overdue') {
          addNotification({
            title: 'Conta vencida',
            description,
            iconColor: '#ef4444',
            link: '/contas?tab=vencidas',
          })
        } else if (alert.type === 'upcoming') {
          const due = new Date(account.dueDate)
          const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
          const diffMs = dueDay.getTime() - today.getTime()
          const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))

          const title =
            diffDays === 0
              ? 'Conta vence hoje'
              : diffDays === 1
                ? 'Conta vence amanhã'
                : `Conta vence em ${diffDays} dias`

          addNotification({
            title,
            description,
            iconColor: '#f59e0b',
            link: '/contas?tab=a_vencer',
          })
        }
      }
    }
  }, [enabled, family, contas])

  // Rodar na montagem / quando contas mudarem
  useEffect(() => {
    syncBillNotifications()
  }, [syncBillNotifications])

  // Rodar a cada 60 segundos (setInterval)
  useEffect(() => {
    if (!enabled || !family) return
    const interval = setInterval(() => {
      refetch().then(() => {
        syncBillNotifications()
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [enabled, family, refetch, syncBillNotifications])

  // Rodar ao receber evento custom 'ff-refresh'
  useEffect(() => {
    if (!enabled || !family) return
    const handleRefresh = () => {
      refetch().then(() => {
        syncBillNotifications()
      })
    }
    window.addEventListener('ff-refresh', handleRefresh)
    return () => {
      window.removeEventListener('ff-refresh', handleRefresh)
    }
  }, [enabled, family, refetch, syncBillNotifications])
}
