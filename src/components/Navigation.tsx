import { useState } from 'react'
import {
  Home,
  List,
  CreditCard,
  Trophy,
  User,
  MoreHorizontal,
  Home as HouseIcon,
  TrendingUp,
  Wallet,
  LineChart,
  Bot,
  Tags,
  LayoutDashboard,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePendingInvoicesCount } from '@/hooks/use-pending-invoices-count'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationCenter } from '@/components/NotificationCenter'
import { MoreMenu } from '@/components/MoreMenu'

export function Header() {
  const { user, family } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <header
        role="banner"
        className="h-16 bg-white border-b border-gray-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-subtle theme-transition"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <div
              className="w-9 h-9 rounded-xl bg-[#166534] flex items-center justify-center text-white"
              aria-hidden="true"
            >
              <HouseIcon className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:inline">
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
          <button
            onClick={() => setMoreOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-5 w-5 text-gray-600" aria-hidden="true" />
          </button>
          <ThemeToggle />
          <NotificationCenter />
          {user && (
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/profile')}
            >
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
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
      <MoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuth()
  const pendingCount = usePendingInvoicesCount(family?.id)

  const navItems = [
    { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transações', path: '/transacoes', icon: List },
    { label: 'Cartões', path: '/cards', icon: CreditCard },
    { label: 'Casa', path: '/casa', icon: Home },
    { label: 'Patrimônio', path: '/patrimonio', icon: TrendingUp },
    { label: 'Orçamentos', path: '/orcamentos', icon: Wallet },
    { label: 'Evolução', path: '/evolucao', icon: LineChart },
    { label: 'Desafios', path: '/challenges', icon: Trophy },
    { label: 'Consultora', path: '/consultora', icon: Bot },
    { label: 'Regras', path: '/regras-categorizacao', icon: Tags },
    { label: 'Perfil', path: '/profile', icon: User },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col min-h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div
          className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center text-white"
          aria-hidden="true"
        >
          <HouseIcon className="h-6 w-6" />
        </div>
        <div>
          <span className="font-bold text-xl text-gray-900 block">Família Finance</span>
          <span className="text-xs text-gray-500 leading-tight block">
            Finanças para quem mora junto
          </span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1" aria-label="Navegação lateral">
        {navItems.map((item) => {
          const isCurrent =
            location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all relative',
                isCurrent
                  ? 'bg-emerald-50 text-[#166534] font-semibold border-l-4 border-[#166534]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon
                className={cn('h-5 w-5', isCurrent ? 'text-[#166534]' : 'text-gray-400')}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {item.path === '/cards' && pendingCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuth()
  const pendingCount = usePendingInvoicesCount(family?.id)

  const tabs = [
    { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transações', path: '/transacoes', icon: List },
    { label: 'Cartões', path: '/cards', icon: CreditCard },
    { label: 'Casa', path: '/casa', icon: Home },
    { label: 'Perfil', path: '/profile', icon: User },
  ]

  return (
    <nav
      role="tablist"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-30 lg:hidden shadow-lg theme-transition"
    >
      {tabs.map((tab) => {
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
            {tab.path === '/cards' && pendingCount > 0 && (
              <span className="absolute top-0 right-[25%] bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 z-10">
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
    </nav>
  )
}
