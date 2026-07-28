import { Link, useLocation } from 'react-router-dom'
import { Home, List, CreditCard, Bot, User, Home as HomeIcon, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export function Sidebar() {
  const location = useLocation()

  const navItems = [
    { label: 'Início', path: '/dashboard', icon: Home, active: true },
    { label: 'Transações', path: '/transacoes', icon: List, active: false },
    { label: 'Cartões', path: '/cartoes', icon: CreditCard, active: false },
    { label: 'IA', path: '/ia', icon: Bot, active: false },
    { label: 'Perfil', path: '/profile', icon: User, active: true },
  ]

  const handleDisabledClick = (e: React.MouseEvent, active: boolean) => {
    if (!active) {
      e.preventDefault()
      toast({ description: 'Em breve', duration: 2000 })
    }
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 space-y-6">
      <div className="flex items-center space-x-3 px-3 py-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
          <HomeIcon className="w-5 h-5" />
          <DollarSign className="w-3 h-3 absolute" />
        </div>
        <span className="font-bold text-xl text-gray-900">Família Finance</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isCurrent = location.pathname === item.path

          return (
            <Link
              key={item.label}
              to={item.active ? item.path : '#'}
              onClick={(e) => handleDisabledClick(e, item.active)}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150',
                isCurrent
                  ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-700 font-semibold shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icon className={cn('w-5 h-5', isCurrent ? 'text-emerald-700' : 'text-gray-500')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
