import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { getUpcomingAndOverdueTasks } from '@/services/household-tasks'
import { getChallengesByFamilyId } from '@/services/challenges'
import {
  getTransactionsByFamilyAndMonth,
  getTransactionsByFamilyAndDateRange,
} from '@/services/transactions'
import { getBudgetsByFamilyId } from '@/services/budgets'
import { getNotificationsByFamilyId } from '@/services/notifications'
import { addNotification } from '@/stores/notifications'
import {
  notificationsSupported,
  sendNotification,
  hasNotificationBeenSent,
  markNotificationSent,
  getTodayKey,
} from '@/lib/notification-utils'
import type { InvoiceRecord, NotificationServerRecord } from '@/types/finance'

export function useNotifications() {
  const { user, member, family } = useAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Realtime subscription for server notifications
  useEffect(() => {
    if (!family?.id) return

    const syncBackendNotifications = async () => {
      try {
        const records = await getNotificationsByFamilyId(family.id)
        for (const r of records) {
          const timestamp = new Date(r.created).getTime()
          addNotification({
            id: r.id,
            title: r.title,
            description: r.message,
            timestamp,
            read: r.is_read,
            type: r.type,
            priority: (r.metadata?.priority as 'high' | 'medium' | 'low') || undefined,
            metadata: r.metadata,
          })
        }
      } catch {
        /* ignore */
      }
    }

    syncBackendNotifications()

    let unsubscribe: (() => void) | undefined
    pb.collection('notifications')
      .subscribe('*', (e) => {
        if (e.action === 'create' || e.action === 'update') {
          const r = e.record as unknown as NotificationServerRecord
          if (r.family_id === family.id) {
            const timestamp = new Date(r.created).getTime()
            addNotification({
              id: r.id,
              title: r.title,
              description: r.message,
              timestamp,
              read: r.is_read,
              type: r.type,
              priority: (r.metadata?.priority as 'high' | 'medium' | 'low') || undefined,
              metadata: r.metadata,
            })
          }
        }
      })
      .then((unsub) => {
        unsubscribe = unsub
      })
      .catch(() => {})

    return () => {
      if (unsubscribe) unsubscribe()
      pb.collection('notifications')
        .unsubscribe('*')
        .catch(() => {})
    }
  }, [family?.id])

  useEffect(() => {
    if (!user || !family || !member) return
    if (!notificationsSupported()) return

    if (Notification.permission === 'default') {
      const hasAsked = localStorage.getItem('ff_notif_asked')
      if (!hasAsked) {
        localStorage.setItem('ff_notif_asked', '1')
        Notification.requestPermission()
      }
    }

    if (Notification.permission !== 'granted') return

    const checkAll = async () => {
      const todayKey = getTodayKey()
      const now = new Date()

      if (member.notify_bills) {
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
            if (diffDays >= 0 && diffDays <= 3) {
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
            const diffHours = (due.getTime() - today.getTime()) / 3600000
            if (diffHours <= 24) {
              const key = `task_${task.id}_${todayKey}`
              if (!hasNotificationBeenSent(key)) {
                const dayText = diffHours <= 0 ? 'vence hoje' : 'vence amanhã'
                sendNotification(task.title, `${task.title} ${dayText}`)
                markNotificationSent(key)
              }
            }
          }
        } catch {
          /* noop */
        }
      }

      if (member.notify_ai_tips) {
        try {
          const budgets = await getBudgetsByFamilyId(family.id)
          const now2 = new Date()
          const startDate = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`
          const nextMonth = now2.getMonth() === 11 ? 0 : now2.getMonth() + 1
          const nextYear = now2.getMonth() === 11 ? now2.getFullYear() + 1 : now2.getFullYear()
          const endDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`
          const transactions = await getTransactionsByFamilyAndDateRange(
            family.id,
            startDate,
            endDate,
          )
          for (const budget of budgets) {
            if (!budget.is_active) continue
            const spent = transactions
              .filter(
                (t: any) =>
                  t.type === 'expense' &&
                  t.category_id === budget.category_id &&
                  (!budget.member_id || t.owner_id === budget.member_id),
              )
              .reduce((s: number, t: any) => s + t.amount, 0)
            const pct = (spent / budget.monthly_limit) * 100
            if (pct >= 80) {
              const threshold = pct >= 100 ? 100 : 80
              const key = `budget_${budget.id}_${threshold}_${todayKey}`
              if (!hasNotificationBeenSent(key)) {
                const cat = budget.expand?.category_id
                const title = pct >= 100 ? 'Orçamento excedido!' : 'Orçamento quase no limite'
                const msg =
                  pct >= 100
                    ? `Orçamento excedido: ${cat?.name || 'Categoria'} gastou ${Math.round(pct)}% do limite`
                    : `${cat?.name || 'Categoria'} atingiu ${Math.round(pct)}% do orçamento`
                sendNotification(title, msg)
                markNotificationSent(key)
              }
            }
          }
        } catch {
          /* noop */
        }
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
