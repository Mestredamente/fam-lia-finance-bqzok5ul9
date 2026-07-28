import { Link, useLocation } from 'react-router-dom'
import { Home, List, CreditCard, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export function BottomNav() {
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-40 flex items-center justify-around px-2 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon
        const isCurrent = location.pathname === item.path

        return (
          <Link
            key={item.label}
            to={item.active ? item.path : '#'}
            onClick={(e) => handleDisabledClick(e, item.active)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1 relative text-xs font-medium transition-colors',
              isCurrent ? 'text-emerald-700 font-semibold' : 'text-gray-500 hover:text-gray-800',
            )}
          >
            {isCurrent && (
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full absolute -top-1" />
            )}
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
