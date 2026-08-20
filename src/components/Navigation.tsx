import { useState, useMemo } from 'react'
import {
  Home,
  List,
  User,
  LayoutDashboard,
  Plus,
  CloudOff,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Bot,
  Eye,
  EyeOff,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { usePendingInvoicesCount } from '@/hooks/use-pending-invoices-count'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePrivacy } from '@/hooks/use-privacy'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/NotificationCenter'
import { CommandMenu } from '@/components/CommandMenu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toggleSidebarGlobalState, GLOBAL_COLLAPSED_STORAGE_KEY } from '@/components/Sidebar'
import ConsultoraView from '@/pages/Consultora'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Início',
  '/dashboard': 'Início',
  '/transacoes': 'Transações',
  '/cards': 'Cartões',
  '/contas': 'Contas a Pagar',
  '/orcamentos': 'Orçamentos',
  '/patrimonio': 'Balanço',
  '/investimentos': 'Investimentos',
  '/projections': 'Projeções',
  '/metas': 'Metas',
  '/dividas': 'Dívidas',
  '/challenges': 'Desafios',
  '/evolucao': 'Evolução',
  '/profile': 'Perfil',
  '/notificacoes': 'Notificações',
  '/casa': 'Casa',
  '/familia': 'Família',
  '/membros': 'Membros',
  '/regras-categorizacao': 'Regras',
  '/categorias': 'Categorias',
  '/recorrentes': 'Recorrentes',
}

function getBreadcrumb(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  if (pathname.startsWith('/cards/')) return 'Detalhes do Cartão'
  return 'Família Finance'
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, family, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const { privacyMode, togglePrivacyMode } = usePrivacy()

  const [commandOpen, setCommandOpen] = useState(false)
  const [consultoraOpen, setConsultoraOpen] = useState(false)

  const breadcrumb = useMemo(() => getBreadcrumb(location.pathname), [location.pathname])

  const handleLogout = () => {
    signOut()
    toast({ title: 'Até logo!', description: 'Você saiu da sua conta.' })
    navigate('/')
  }

  const handleToggleSidebar = () => {
    toggleSidebarGlobalState()
  }

  return (
    <>
      <header
        role="banner"
        className="h-16 max-w-full overflow-x-hidden bg-white dark:bg-card border-b border-gray-200 dark:border-gray-800 px-3 md:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-subtle theme-transition"
      >
        {/* Left: Mobile Menu / Collapse Button + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            </button>
          )}

          {/* Desktop sidebar collapse trigger */}
          <button
            onClick={handleToggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Alternar menu lateral"
            aria-label="Alternar menu lateral"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* Breadcrumb / Page Title */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-bold text-base sm:text-lg text-gray-900 dark:text-foreground truncate">
              {breadcrumb}
            </h1>
            {family && (
              <Badge className="hidden md:inline-flex bg-emerald-50 text-[#166534] dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 font-medium text-xs">
                {family.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Center: Command Menu trigger (visible on md+) */}
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="w-full h-9 px-3.5 rounded-full bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/60 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 flex items-center justify-between text-xs text-muted-foreground transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Buscar... (Ctrl+K)</span>
            </div>
            <kbd className="hidden lg:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded bg-white dark:bg-gray-700 px-1.5 font-mono text-[10px] font-medium text-muted-foreground border border-gray-200 dark:border-gray-600">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile search trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Abrir busca rápida"
          >
            <Search className="h-5 w-5" />
          </button>

          {!isOnline && (
            <Badge
              className="bg-amber-500 text-white hover:bg-amber-500 border-0 gap-1 px-2 py-0.5"
              aria-label="Você está offline"
            >
              <CloudOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Offline</span>
            </Badge>
          )}

          {/* Consultora IA Drawer Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConsultoraOpen(true)}
            className="relative rounded-lg text-gray-600 dark:text-gray-300 hover:text-[#166534] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="Consultora Financeira IA"
            aria-label="Abrir consultora financeira"
          >
            <Bot className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22C55E]" />
          </Button>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Privacy Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePrivacyMode}
            className={cn(
              'rounded-lg transition-colors',
              privacyMode
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}
            title={privacyMode ? 'Desativar modo privacidade' : 'Ativar modo privacidade'}
            aria-label={privacyMode ? 'Desativar modo privacidade' : 'Ativar modo privacidade'}
          >
            {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>

          {/* Avatar Dropdown Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 p-1 rounded-full hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-[#166534] transition-all ml-1"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-[#22C55E]">
                    <AvatarImage
                      src={
                        user.avatar
                          ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`
                          : undefined
                      }
                      alt={user.name}
                    />
                    <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold text-xs sm:text-sm">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 hidden xl:inline max-w-[120px] truncate">
                    {user.name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer gap-2 py-2"
                >
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2 py-2 text-danger focus:text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Command Menu Modal */}
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Consultora Lateral Drawer (Sheet) */}
      <Sheet open={consultoraOpen} onOpenChange={setConsultoraOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] max-w-[90vw] p-4 sm:p-6 overflow-y-auto"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-base font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#166534] dark:text-emerald-400" />
              Consultora Inteligente
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2">
            <ConsultoraView />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function BottomNav({ onFabClick }: { onFabClick?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { family } = useAuth()
  const pendingCount = usePendingInvoicesCount(family?.id)

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
      className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-card border-t border-gray-200 dark:border-gray-800 flex items-center justify-around z-30 lg:hidden shadow-lg theme-transition"
    >
      {/* Início, Transações */}
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
          className="-translate-y-4 w-12 h-12 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-card transition-transform active:scale-95 cursor-pointer"
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
