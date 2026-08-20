import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  List,
  CreditCard,
  LineChart,
  Wallet,
  CalendarClock,
  PiggyBank,
  TrendingUp,
  Target,
  FileText,
  Trophy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  type LucideIcon,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { usePendingInvoicesCount } from '@/hooks/use-pending-invoices-count'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
      { label: 'Orçamentos', path: '/orcamentos', icon: Wallet, perm: 'canViewBudgets' },
    ],
  },
  {
    label: 'Patrimônio',
    items: [
      { label: 'Balanço', path: '/patrimonio', icon: PiggyBank, perm: 'canViewPatrimony' },
      { label: 'Investimentos', path: '/investimentos', icon: TrendingUp },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Projeções', path: '/projections', icon: CalendarClock },
      { label: 'Metas', path: '/metas', icon: Target },
      { label: 'Dívidas', path: '/dividas', icon: FileText },
      { label: 'Desafios', path: '/challenges', icon: Trophy },
    ],
  },
]

const GROUP_STORAGE_KEY = 'ff_sidebar_collapsed_groups'
export const GLOBAL_COLLAPSED_STORAGE_KEY = 'ff_sidebar_collapsed_global'
const SIDEBAR_COLLAPSE_EVENT = 'ff-sidebar-toggle-collapse'

export function toggleSidebarGlobalState(collapsed?: boolean) {
  const current = localStorage.getItem(GLOBAL_COLLAPSED_STORAGE_KEY) === 'true'
  const next = collapsed !== undefined ? collapsed : !current
  localStorage.setItem(GLOBAL_COLLAPSED_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(SIDEBAR_COLLAPSE_EVENT, { detail: { isCollapsed: next } }))
  return next
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuth()
  const perms = usePermissions()
  const pendingCount = usePendingInvoicesCount(family?.id)

  // Global desktop collapsed mode (icon only)
  const [isGlobalCollapsed, setIsGlobalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GLOBAL_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const handleToggle = (e: CustomEvent<{ isCollapsed: boolean }>) => {
      setIsGlobalCollapsed(e.detail.isCollapsed)
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === GLOBAL_COLLAPSED_STORAGE_KEY && e.newValue !== null) {
        setIsGlobalCollapsed(e.newValue === 'true')
      }
    }
    window.addEventListener(SIDEBAR_COLLAPSE_EVENT as any, handleToggle)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSE_EVENT as any, handleToggle)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const computeInitialCollapsed = (pathname: string) => {
    const activeGroup =
      pathname === '/'
        ? 'Visão Geral'
        : (NAV_GROUPS.find((g) =>
            g.items.some((item) => pathname === item.path || pathname.startsWith(item.path + '/')),
          )?.label ?? 'Visão Geral')
    return new Set(NAV_GROUPS.map((g) => g.label).filter((l) => l !== activeGroup))
  }

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(GROUP_STORAGE_KEY)
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

  const toggleGlobalCollapsed = () => {
    const next = !isGlobalCollapsed
    setIsGlobalCollapsed(next)
    localStorage.setItem(GLOBAL_COLLAPSED_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(SIDEBAR_COLLAPSE_EVENT, { detail: { isCollapsed: next } }))
  }

  const toggleGroup = (label: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    setCollapsedGroups(next)
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify([...next]))
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
      {/* Backdrop for mobile */}
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
          'fixed inset-y-0 left-0 z-50 bg-white dark:bg-card border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isGlobalCollapsed ? 'w-72 lg:w-[72px]' : 'w-72 lg:w-64',
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header / Brand */}
        <div
          className={cn(
            'p-4 flex items-center border-b border-gray-100 dark:border-gray-800 transition-all',
            isGlobalCollapsed ? 'lg:p-3 lg:justify-center' : 'justify-between gap-2',
          )}
        >
          <div
            className="flex items-center gap-3 cursor-pointer min-w-0"
            onClick={() => handleNavigate('/dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#166534] flex items-center justify-center text-white shrink-0">
              <Home className="h-5 w-5" />
            </div>
            <div
              className={cn(
                'flex-1 min-w-0 transition-opacity duration-200',
                isGlobalCollapsed ? 'lg:hidden' : 'block',
              )}
            >
              <span className="font-bold text-base text-gray-900 dark:text-foreground block truncate">
                Família Finance
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight block truncate">
                Finanças para quem mora junto
              </span>
            </div>
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleGlobalCollapsed}
            className={cn(
              'hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
              isGlobalCollapsed && 'hidden',
            )}
            title={isGlobalCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label="Alternar menu lateral"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav
          className={cn(
            'flex-1 p-2 space-y-3 overflow-y-auto overflow-x-hidden',
            isGlobalCollapsed && 'lg:p-2 lg:space-y-4',
          )}
          aria-label="Navegação lateral"
        >
          {visibleGroups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.label)
            return (
              <div key={group.label} className="space-y-1">
                {/* Group label - hidden in desktop collapsed mode */}
                <div className={cn(isGlobalCollapsed ? 'lg:hidden' : 'block')}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        isCollapsed && '-rotate-90',
                      )}
                    />
                    <span>{group.label}</span>
                    {isGroupActive(group) && isCollapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                    )}
                  </button>
                </div>

                {/* Divider when desktop collapsed */}
                {isGlobalCollapsed && (
                  <div className="hidden lg:block my-2 border-t border-gray-100 dark:border-gray-800" />
                )}

                {/* Group items */}
                <div
                  className={cn(
                    'space-y-0.5 overflow-hidden transition-all duration-300',
                    !isGlobalCollapsed && isCollapsed ? 'max-h-0' : 'max-h-96',
                  )}
                >
                  {group.items.map((item) => {
                    const active = isItemActive(item.path)
                    const ItemIcon = item.icon

                    const buttonContent = (
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className={cn(
                          'w-full flex items-center rounded-xl text-sm font-medium transition-all relative',
                          isGlobalCollapsed
                            ? 'lg:justify-center lg:p-2.5 px-3 py-2.5 gap-3'
                            : 'px-3.5 py-2.5 gap-3',
                          active
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#166534] dark:text-emerald-400 font-semibold shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-foreground',
                        )}
                        aria-label={item.label}
                      >
                        <ItemIcon
                          className={cn(
                            'h-5 w-5 shrink-0',
                            active
                              ? 'text-[#166534] dark:text-emerald-400'
                              : 'text-gray-400 dark:text-gray-500',
                          )}
                        />
                        <span
                          className={cn(
                            'truncate',
                            isGlobalCollapsed ? 'lg:hidden block' : 'block',
                          )}
                        >
                          {item.label}
                        </span>
                        {item.path === '/cards' && pendingCount > 0 && (
                          <span
                            className={cn(
                              'bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center',
                              isGlobalCollapsed
                                ? 'lg:absolute lg:top-1 lg:right-1 min-w-[16px] h-[16px] px-1 ml-auto'
                                : 'ml-auto min-w-[18px] h-[18px] px-1',
                            )}
                          >
                            {pendingCount > 9 ? '9+' : pendingCount}
                          </span>
                        )}
                      </button>
                    )

                    if (isGlobalCollapsed) {
                      return (
                        <div key={item.path} className="hidden lg:block">
                          <Tooltip>
                            <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )
                    }

                    return <div key={item.path}>{buttonContent}</div>
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Bottom Expand Toggle in Global Collapsed mode */}
        {isGlobalCollapsed && (
          <div className="hidden lg:flex p-2 border-t border-gray-100 dark:border-gray-800 justify-center">
            <button
              onClick={toggleGlobalCollapsed}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
