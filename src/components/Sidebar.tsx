import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  List,
  CreditCard,
  Home,
  TrendingUp,
  Wallet,
  LineChart,
  Trophy,
  Bot,
  Tags,
  User,
  ChevronDown,
  X,
  PiggyBank,
  Users,
  CalendarClock,
  Target,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { usePendingInvoicesCount } from '@/hooks/use-pending-invoices-count'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  perm?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Evolução', path: '/evolucao', icon: LineChart },
    ],
  },
  {
    label: 'Finanças',
    items: [
      { label: 'Transações', path: '/transacoes', icon: List },
      { label: 'Cartões', path: '/cards', icon: CreditCard },
      { label: 'Contas a Pagar', path: '/contas', icon: CalendarClock },
      { label: 'Notificações', path: '/notificacoes', icon: Bell },
      { label: 'Orçamentos', path: '/orcamentos', icon: Wallet, perm: 'canViewBudgets' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Projeções', path: '/projections', icon: CalendarClock },
      { label: 'Patrimônio', path: '/patrimonio', icon: PiggyBank, perm: 'canViewPatrimony' },
      { label: 'Metas', path: '/metas', icon: Target },
      { label: 'Casa', path: '/casa', icon: Home },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Desafios', path: '/challenges', icon: Trophy },
      { label: 'Consultora', path: '/consultora', icon: Bot },
      { label: 'Regras', path: '/regras-categorizacao', icon: Tags },
      { label: 'Membros', path: '/familia', icon: Users, perm: 'canManageMembers' },
      { label: 'Perfil', path: '/profile', icon: User },
    ],
  },
]

const STORAGE_KEY = 'ff_sidebar_collapsed'

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuth()
  const perms = usePermissions()
  const pendingCount = usePendingInvoicesCount(family?.id)

  const computeInitialCollapsed = (pathname: string) => {
    const activeGroup =
      pathname === '/'
        ? 'Visão Geral'
        : (NAV_GROUPS.find((g) =>
            g.items.some((item) => pathname === item.path || pathname.startsWith(item.path + '/')),
          )?.label ?? 'Visão Geral')
    return new Set(NAV_GROUPS.map((g) => g.label).filter((l) => l !== activeGroup))
  }

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return new Set(JSON.parse(saved))
      } catch {
        /* intentionally ignored */
      }
    }
    return computeInitialCollapsed(window.location.pathname)
  })
  const [isMobile, setIsMobile] = useState(false)
  const touchStartX = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveCollapsed = collapsed

  const toggleGroup = (label: string) => {
    const next = new Set(collapsed)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    setCollapsed(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    if (isMobile) onClose()
  }

  const isItemActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const isGroupActive = (group: NavGroup) => group.items.some((item) => isItemActive(item.path))

  const isVisible = (item: NavItem) => {
    if (!item.perm) return true
    const fn = (perms as Record<string, () => boolean>)[item.perm]
    return fn ? fn() : true
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientX - touchStartX.current < -80) onClose()
  }

  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(isVisible),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:static lg:z-auto lg:w-64 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center text-white">
            <Home className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-xl text-gray-900 block">Família Finance</span>
            <span className="text-xs text-gray-500 leading-tight block">
              Finanças para quem mora junto
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navegação lateral">
          {visibleGroups.map((group) => {
            const isCollapsed = effectiveCollapsed.has(group.label)
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', isCollapsed && '-rotate-90')}
                  />
                  {group.label}
                  {isGroupActive(group) && isCollapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  )}
                </button>
                <div
                  className={cn(
                    'space-y-0.5 overflow-hidden transition-all duration-300',
                    isCollapsed ? 'max-h-0' : 'max-h-96',
                  )}
                >
                  {group.items.map((item) => {
                    const active = isItemActive(item.path)
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative',
                          active
                            ? 'bg-emerald-50 text-[#166534] font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        <item.icon
                          className={cn('h-5 w-5', active ? 'text-[#166534]' : 'text-gray-400')}
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
                </div>
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
