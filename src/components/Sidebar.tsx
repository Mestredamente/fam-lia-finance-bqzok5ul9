import { Link, useLocation } from 'react-router-dom'
import { Home, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const location = useLocation()
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Perfil', path: '/profile', icon: User },
  ]
  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <span className="font-bold text-gray-900">Família Finance</span>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
