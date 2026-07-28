import { Home, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useMockAuth } from '@/hooks/use-mock-auth'

export function Header() {
  const { user, family } = useMockAuth()

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-800 text-white">
          <Home className="w-5 h-5 relative" />
          <DollarSign className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-emerald-300 font-bold" />
        </div>
        <span className="font-bold text-lg text-gray-900 hidden sm:inline">Família Finance</span>
        {family && (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 font-medium">
            {family.name}
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-semibold flex items-center justify-center border-2 border-emerald-500 shadow-xs">
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  )
}
