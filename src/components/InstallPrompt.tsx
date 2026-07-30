import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/use-pwa-install'

export function InstallPrompt() {
  const { canInstall, promptInstall, dismissInstall } = usePwaInstall()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!canInstall) return
    const dismissed = localStorage.getItem('ff_install_dismissed')
    const onboardingDone = localStorage.getItem('ff_onboarding_complete')
    if (!dismissed && onboardingDone === 'true') {
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [canInstall])

  const handleInstall = async () => {
    await promptInstall()
    setShow(false)
    localStorage.setItem('ff_install_dismissed', 'true')
  }

  const handleDismiss = () => {
    setShow(false)
    dismissInstall()
    localStorage.setItem('ff_install_dismissed', 'true')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-40 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#10B981] flex items-center justify-center text-white font-bold text-sm shrink-0">
          FF
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Instalar app</p>
          <p className="text-xs text-gray-500">Instale o Família Finance para acesso rápido</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-8">
            Agora não
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-[#166534] hover:bg-[#15803D] text-xs h-8"
          >
            <Download className="h-3 w-3 mr-1" /> Instalar
          </Button>
        </div>
      </div>
    </div>
  )
}
