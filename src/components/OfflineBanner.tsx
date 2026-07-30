import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[55] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium animate-fade-in-down">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Você está offline. Mostrando dados salvos.</span>
    </div>
  )
}
