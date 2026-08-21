import { useState, useEffect } from 'react'
import { X, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/use-pwa-install'

const DISMISS_KEY = 'ff_install_banner_dismissed_until'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function DashboardInstallBanner() {
  const { canInstall, promptInstall, isIOS, isChromeIOS, isStandalone } = usePwaInstall()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Se standalone ou Chrome no iOS -> nunca mostrar
    if (isStandalone || isChromeIOS) {
      setShow(false)
      return
    }

    // Verificar se foi dispensado
    const dismissedUntil = localStorage.getItem(DISMISS_KEY)
    if (dismissedUntil) {
      const untilMs = parseInt(dismissedUntil, 10)
      if (Date.now() < untilMs) {
        setShow(false)
        return
      }
    }

    // Se iOS Safari ou Desktop/Android com canInstall
    if (isIOS || canInstall) {
      const timer = setTimeout(() => {
        setShow(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [canInstall, isIOS, isChromeIOS, isStandalone])

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS))
  }

  const handleInstall = async () => {
    const installed = await promptInstall()
    if (installed) {
      setShow(false)
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS))
    }
  }

  if (!show || isStandalone || isChromeIOS) return null

  return (
    <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 z-50 bg-[#059669] text-white shadow-lg border-t border-emerald-500/30 transition-all duration-300 animate-slide-up">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {isIOS ? (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Share2 className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-medium leading-tight truncate sm:whitespace-normal">
                Toque em Compartilhar ⬆️ e depois &apos;Adicionar à Tela de Início&apos;
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleDismiss}
                className="bg-white text-[#059669] hover:bg-emerald-50 h-8 px-3 text-xs font-semibold rounded-lg shadow-xs"
              >
                Entendi
              </Button>
              <button
                onClick={handleDismiss}
                aria-label="Fechar"
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Download className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-medium leading-tight truncate sm:whitespace-normal">
                Instale o app para acesso rápido e offline
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-white text-[#059669] hover:bg-emerald-50 h-8 px-3 text-xs font-semibold rounded-lg shadow-xs"
              >
                Instalar
              </Button>
              <button
                onClick={handleDismiss}
                aria-label="Fechar"
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
