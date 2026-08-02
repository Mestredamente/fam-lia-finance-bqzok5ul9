import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { isIOS } from '@/lib/notification-utils'

export function DashboardInstallBanner() {
  const { canInstall, promptInstall } = usePwaInstall()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isIOS()) return
    if (!canInstall) return

    const visitCount = parseInt(localStorage.getItem('ff_visit_count') || '0', 10)
    if (visitCount < 3) return

    const dismissedStr = localStorage.getItem('ff_install_dismissed')
    if (dismissedStr) {
      const dismissedAt = parseInt(dismissedStr, 10)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedAt < sevenDaysMs) return
    }

    const timer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(timer)
  }, [canInstall])

  const handleInstall = async () => {
    await promptInstall()
    setShow(false)
    localStorage.setItem('ff_install_dismissed', String(Date.now()))
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('ff_install_dismissed', String(Date.now()))
  }

  if (!show) return null

  return (
    <div className="bg-[#166534] text-white rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up">
      <Download className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium flex-1">Instale o app para acesso rápido</p>
      <Button
        size="sm"
        onClick={handleInstall}
        className="bg-white text-[#166534] hover:bg-gray-100 h-8 text-xs"
      >
        Instalar
      </Button>
      <button
        onClick={handleDismiss}
        aria-label="Fechar"
        className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
