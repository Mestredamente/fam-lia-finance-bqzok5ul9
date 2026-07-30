import { useState } from 'react'
import { Share, Plus, Smartphone, Bell, BellOff, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import {
  isIOS,
  isStandalone,
  notificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/notification-utils'
import { toast } from '@/hooks/use-toast'

export function InstallAppDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { canInstall, promptInstall } = usePwaInstall()
  const [installing, setInstalling] = useState(false)
  const standalone = isStandalone()
  const ios = isIOS()
  const showIOSInstructions = ios && !standalone
  const notifSupported = notificationsSupported()
  const notifPermission = getNotificationPermission()

  const handleInstall = async () => {
    setInstalling(true)
    const ok = await promptInstall()
    setInstalling(false)
    if (ok) {
      toast({ title: 'App instalado!', description: 'Família Finance foi instalado com sucesso.' })
      if (notifSupported && notifPermission === 'default') {
        const perm = await requestNotificationPermission()
        if (perm === 'granted') {
          toast({
            title: 'Notificações ativadas!',
            description: 'Você receberá lembretes importantes.',
          })
        }
      }
      onOpenChange(false)
    }
  }

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission()
    if (perm === 'granted') {
      toast({ title: 'Notificações ativadas!' })
    } else {
      toast({
        title: 'Notificações bloqueadas',
        description: 'Ative nas configurações do seu navegador.',
        variant: 'destructive',
      })
    }
  }

  const iosSteps = [
    {
      icon: Share,
      title: 'Toque no botão Compartilhar',
      desc: 'No rodapé do Safari, toque no ícone de compartilhar.',
    },
    {
      icon: Plus,
      title: 'Selecione "Adicionar à Tela de Início"',
      desc: 'Role e toque em "Adicionar à Tela de Início".',
    },
    {
      icon: Smartphone,
      title: 'Confirme e pronto!',
      desc: 'Toque em "Adicionar" no canto superior direito.',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Smartphone className="h-5 w-5 text-[#166534]" />
            Instalar App
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Instale o Família Finance para acesso rápido e notificações locais.
          </DialogDescription>
        </DialogHeader>

        {standalone ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">✅ App já instalado!</p>
            {notifSupported && notifPermission === 'default' && (
              <Button
                className="w-full bg-[#166534] hover:bg-[#15803D]"
                onClick={handleEnableNotifications}
              >
                <Bell className="h-4 w-4 mr-2" /> Ativar notificações
              </Button>
            )}
            {notifSupported && notifPermission === 'denied' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-left">
                <BellOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Notificações bloqueadas. Ative nas configurações do navegador para receber
                  lembretes.
                </p>
              </div>
            )}
            {notifSupported && notifPermission === 'granted' && (
              <p className="text-xs text-[#166534] font-medium">🔔 Notificações ativadas</p>
            )}
          </div>
        ) : canInstall ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">Clique abaixo para instalar no seu dispositivo.</p>
            <Button
              className="w-full bg-[#166534] hover:bg-[#15803D]"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Instalando...' : 'Instalar agora'}
            </Button>
          </div>
        ) : showIOSInstructions ? (
          <div className="space-y-4 py-2">
            <p className="text-sm font-semibold text-gray-700">No iPhone/iPad (Safari):</p>
            <div className="space-y-3">
              {iosSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-[#166534] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-900">{step.title}</p>
                    <p className="text-[11px] text-gray-500">{step.desc}</p>
                    <step.icon className="h-5 w-5 text-[#166534] mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">Seu navegador não exibiu o prompt automático.</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Chrome/Edge: menu (⋮) → "Instalar app"</p>
              <p>• Verifique se o navegador suporta PWA</p>
            </div>
          </div>
        )}

        {notifSupported && notifPermission === 'default' && !standalone && (
          <div className="pt-2 border-t border-gray-100">
            <Button variant="outline" className="w-full" onClick={handleEnableNotifications}>
              <Bell className="h-4 w-4 mr-2" /> Ativar notificações
            </Button>
          </div>
        )}

        <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
          <Info className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 leading-relaxed">
            As notificações funcionam quando o app está aberto ou em segundo plano. Notificações
            push (que funcionam com o app fechado) serão implementadas futuramente com serviço
            server-side.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
