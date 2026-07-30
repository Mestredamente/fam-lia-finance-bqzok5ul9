import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { getUpcomingAndOverdueTasks } from '@/services/household-tasks'
import { getChallengesByFamilyId } from '@/services/challenges'
import { getTransactionsByFamilyAndMonth } from '@/services/transactions'
import {
  notificationsSupported,
  sendNotification,
  hasNotificationBeenSent,
  markNotificationSent,
  getTodayKey,
} from '@/lib/notification-utils'
import type { InvoiceRecord } from '@/types/finance'

export function useNotifications() {
  const { user, member, family } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user || !family || !member) return
    if (!notificationsSupported() || Notification.permission !== 'granted') return

    const checkAll = async () => {
      const todayKey = getTodayKey()
      const now = new Date()

      try {
        const invoices = await pb.collection('invoices').getFullList<InvoiceRecord>({
          filter: `family_id = "${family.id}" && status = "pending"`,
          expand: 'card_id',
        })
        for (const inv of invoices) {
          const card = inv.expand?.card_id
          if (!card) continue
          const monthRef = new Date(inv.month_ref)
          const dueDate = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, card.due_day)
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
          if (diffDays >= 0 && diffDays <= 2) {
            const key = `invoice_${inv.id}_${todayKey}`
            if (!hasNotificationBeenSent(key)) {
              const dayText =
                diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`
              sendNotification(
                'Fatura vencendo',
                `Sua fatura do cartão ${card.name} vence ${dayText}`,
              )
              markNotificationSent(key)
            }
          }
        }
      } catch {
        /* noop */
      }

      try {
        const tasks = await getUpcomingAndOverdueTasks(family.id, 1)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (const task of tasks) {
          if (!task.due_date) continue
          const due = new Date(task.due_date.split('T')[0] + 'T00:00:00')
          const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
          if (diffDays <= 1) {
            const key = `task_${task.id}_${todayKey}`
            if (!hasNotificationBeenSent(key)) {
              const dayText = diffDays <= 0 ? 'vence hoje' : 'vence amanhã'
              sendNotification(task.title, `${task.title} ${dayText}`)
              markNotificationSent(key)
            }
          }
        }
      } catch {
        /* noop */
      }

      try {
        const hour = now.getHours()
        if (hour >= 20 && hour < 22) {
          const txs = await getTransactionsByFamilyAndMonth(
            family.id,
            now.getFullYear(),
            now.getMonth(),
            member.id,
          )
          const hasToday = txs.some((t) => t.transaction_date.startsWith(todayKey))
          if (!hasToday) {
            const key = `spending_${todayKey}`
            if (!hasNotificationBeenSent(key)) {
              sendNotification('Registre seus gastos', 'Registre seus gastos de hoje')
              markNotificationSent(key)
            }
          }
        }
      } catch {
        /* noop */
      }

      try {
        const challenges = await getChallengesByFamilyId(family.id)
        for (const ch of challenges) {
          if (ch.status !== 'active' || ch.user_id !== member.id) continue
          if (!ch.target_value || ch.target_value <= 0) continue
          if ((ch.current_value || 0) / ch.target_value >= 0.8) {
            const key = `challenge_${ch.id}_${todayKey}`
            if (!hasNotificationBeenSent(key)) {
              sendNotification(
                'Desafio quase completo!',
                'Você está perto de concluir seu desafio!',
              )
              markNotificationSent(key)
            }
          }
        }
      } catch {
        /* noop */
      }
    }

    checkAll()
    intervalRef.current = setInterval(checkAll, 30 * 60 * 1000)

    const onVisible = () => {
      if (!document.hidden) checkAll()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, family, member])

  return null
}
