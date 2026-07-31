import { useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'
import { addNotification } from '@/stores/notifications'
import { formatBRL } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import type { TransactionRecord } from '@/types/finance'

export function useExpenseNotifications(enabled: boolean = true) {
  const { member } = useAuth()
  const memberIdRef = useRef(member?.id)
  memberIdRef.current = member?.id
  const toastRef = useRef(toast)
  toastRef.current = toast

  useRealtime<TransactionRecord>(
    'transactions',
    (e) => {
      if (e.action !== 'create') return
      const tx = e.record
      if (!memberIdRef.current) return
      if (tx.owner_id === memberIdRef.current) return

      pb.collection('transactions')
        .getOne<TransactionRecord>(tx.id, {
          expand: 'owner_id,category_id',
        })
        .then((full) => {
          const cat = full.expand?.category_id
          const owner = full.expand?.owner_id
          const ownerName = owner?.display_name || 'Um membro'
          const catName = cat?.name || 'Sem categoria'
          const prefix = full.type === 'income' ? '+ ' : '- '
          const desc = `${full.description} • ${prefix}${formatBRL(full.amount)} • ${catName}`
          toastRef.current({ title: `${ownerName} adicionou uma transação`, description: desc })
          addNotification({
            title: `${ownerName} adicionou uma transação`,
            description: desc,
            iconColor: cat?.color,
          })
        })
        .catch(() => {
          const desc = `${tx.description} • ${formatBRL(tx.amount)}`
          toastRef.current({ title: 'Nova transação na família', description: desc })
          addNotification({ title: 'Nova transação na família', description: desc })
        })
    },
    enabled && !!member,
  )
}
