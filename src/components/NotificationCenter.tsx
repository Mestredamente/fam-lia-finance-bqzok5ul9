import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useNotificationsStore } from '@/stores/notifications'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return `${Math.floor(diff / 86400000)}d`
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotificationsStore()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h3 className="font-bold text-sm text-gray-900">Notificações</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearNotifications}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma notificação</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {!n.read && <div className="w-2 h-2 rounded-full bg-[#166534] mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium ${n.read ? 'text-gray-500' : 'text-gray-900'}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.description}</p>
                    <span className="text-xs text-gray-300">{timeAgo(n.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
