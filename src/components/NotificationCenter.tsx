import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useNotificationsStore } from '@/stores/notifications'
import { cn } from '@/lib/utils'

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  return `há ${days}d`
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAllRead,
    markAsRead,
    clearNotifications,
    dismissNotification,
  } = useNotificationsStore()
  const navigate = useNavigate()

  const displayedNotifications = notifications.slice(0, 8)

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id)
    if (link) {
      navigate(link)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-sm text-gray-900 dark:text-foreground">Notificações</h3>
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
                title="Limpar todas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {displayedNotifications.length === 0 ? (
            <div className="text-center py-8 px-4 space-y-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Você está em dia ✓
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Nenhuma notificação recente
              </p>
            </div>
          ) : (
            displayedNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n.id, n.link)}
                className={cn(
                  'group relative p-3 border-b border-gray-50 dark:border-gray-800/60 transition-colors',
                  n.link
                    ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30',
                  !n.read && 'bg-blue-50/30 dark:bg-blue-950/20',
                )}
              >
                <div className="flex items-start gap-2 pr-6">
                  {!n.read && <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-xs',
                        n.read
                          ? 'font-medium text-gray-600 dark:text-gray-400'
                          : 'font-bold text-gray-900 dark:text-foreground',
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.description}
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 block">
                      {formatRelativeTime(n.timestamp)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissNotification(n.id)
                  }}
                  className="absolute top-2.5 right-2.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-70 group-hover:opacity-100 transition-opacity"
                  aria-label="Dispensar notificação"
                  title="Dispensar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-8"
            onClick={() => navigate('/notificacoes')}
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
