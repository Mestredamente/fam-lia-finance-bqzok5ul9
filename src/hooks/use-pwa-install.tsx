import { useState, useEffect } from 'react'
import { isIOS, isStandalone } from '@/lib/notification-utils'

export { isIOS, isStandalone }

export function isChromeIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return ua.includes('CriOS')
}

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BIPEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BIPEvent)
    }
    const onInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)

    if (isStandalone()) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome === 'accepted'
  }

  const dismissInstall = () => setDeferredPrompt(null)

  const standalone = isInstalled || isStandalone()
  const chromeIOS = isChromeIOS()
  const ios = isIOS()

  // canInstall: (deferredPrompt existe OU isIOS) E !isStandalone E !isChromeIOS
  const canInstall = (!!deferredPrompt || ios) && !standalone && !chromeIOS

  return {
    canInstall,
    promptInstall,
    dismissInstall,
    isInstalled: standalone,
    isIOS: ios,
    isChromeIOS: chromeIOS,
    isStandalone: standalone,
  }
}
