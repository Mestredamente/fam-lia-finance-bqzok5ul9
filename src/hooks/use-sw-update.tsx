import { useEffect } from 'react'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'

export function useSwUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing
        if (!nw) return
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast({
              title: 'Nova versão disponível!',
              description: 'Atualize para a versão mais recente do app.',
              action: (
                <ToastAction
                  altText="Atualizar"
                  onClick={() => nw.postMessage({ type: 'SKIP_WAITING' })}
                >
                  Atualizar
                </ToastAction>
              ),
            })
          }
        })
      })
    })

    const onControllerChange = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])
}
