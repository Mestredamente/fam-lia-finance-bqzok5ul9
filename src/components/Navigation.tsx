import { Home, List, User, LayoutDashboard, Plus, CloudOff } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePendingInvoicesCount } from '@/hooks/use-pending-invoices-count'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Menu } from 'lucide-react'

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, family } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  return (
    <header
      role="banner"
      className="h-16 max-w-full overflow-x-hidden bg-white dark:bg-card border-b border-gray-200 dark:border-gray-700 px-4 lg:px-8 flex items-center justify-between gap-2 sticky top-0 z-30 shadow-subtle theme-transition"
    >
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          </button>
        )}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <div
            className="w-9 h-9 rounded-xl bg-[#166534] flex items-center justify-center text-white"
            aria-hidden="true"
          >
            <Home className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-foreground hidden sm:inline">
            Família Finance
          </span>
        </div>
        {family && (
          <Badge className="bg-emerald-100 text-[#166534] hover:bg-emerald-100 border border-emerald-300 font-medium">
            {family.name}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {!isOnline && (
          <Badge
            className="bg-amber-500 text-white hover:bg-amber-500 border-0 gap-1"
            aria-label="Você está offline"
          >
            <CloudOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </Badge>
        )}
        <ThemeToggle />
        <NotificationCenter />
        {user && (
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/profile')}
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
              {user.name}
            </span>
            <Avatar className="h-9 w-9 border-2 border-[#22C55E]">
              <AvatarImage
                src={
                  user.avatar
                    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`
                    : undefined
                }
                alt={user.name}
              />
              <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  )
}

export function BottomNav({ onFabClick }: { onFabClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuth()
  const pendingCount = usePendingInvoicesCount(family?.id)

  // The middle slot is now a raised central FAB; the 4 remaining tabs sit
  // around it: Início, Transações, Casa, Perfil. "Cartões" stays available
  // via the sidebar.
  const tabs = [
    { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transações', path: '/transacoes', icon: List },
    { label: 'Casa', path: '/casa', icon: Home },
    { label: 'Perfil', path: '/profile', icon: User },
  ]

  return (
    <nav
      role="tablist"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-card border-t border-gray-200 dark:border-gray-700 flex items-center justify-around z-30 lg:hidden shadow-lg theme-transition"
    >
      {/* Início */}
      {tabs.slice(0, 2).map((tab) => {
        const isCurrent =
          location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
        return (
          <button
            key={tab.label}
            role="tab"
            aria-selected={isCurrent}
            aria-label={tab.label}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center w-full h-full relative"
          >
            {isCurrent && <div className="absolute top-1 w-1.5 h-1.5 rounded-full bg-[#22C55E]" />}
            {tab.path === '/transacoes' && pendingCount > 0 && (
              <span className="absolute top-1 right-[28%] bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 z-10">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
            <tab.icon
              className={cn('h-5 w-5 mt-1', isCurrent ? 'text-[#166534]' : 'text-gray-400')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-xs font-medium mt-0.5',
                isCurrent ? 'text-[#166534] font-bold' : 'text-gray-400',
              )}
            >
              {tab.label}
            </span>
          </button>
        )
      })}

      {/* Central FAB */}
      <div className="flex flex-col items-center justify-center w-full">
        <button
          onClick={onFabClick}
          aria-label="Adicionar"
          className="-translate-y-4 w-12 h-12 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-card transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Casa, Perfil */}
      {tabs.slice(2).map((tab) => {
        const isCurrent =
          location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
        return (
          <button
            key={tab.label}
            role="tab"
            aria-selected={isCurrent}
            aria-label={tab.label}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center w-full h-full relative"
          >
            {isCurrent && <div className="absolute top-1 w-1.5 h-1.5 rounded-full bg-[#22C55E]" />}
            <tab.icon
              className={cn('h-5 w-5 mt-1', isCurrent ? 'text-[#166534]' : 'text-gray-400')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-xs font-medium mt-0.5',
                isCurrent ? 'text-[#166534] font-bold' : 'text-gray-400',
              )}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
