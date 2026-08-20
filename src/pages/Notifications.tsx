import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  CalendarClock,
  Wallet,
  CreditCard,
  Settings,
  ArrowRight,
  Sparkles,
  Layers,
  Inbox,
} from 'lucide-react'
import { useNotificationsStore, type AppNotification } from '@/stores/notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface NotificationPrefs {
  contas_vencidas: boolean
  contas_a_vencer: boolean
  faturas_fechadas: boolean
  orcamento_80: boolean
  orcamento_100: boolean
  recorrentes_geradas: boolean
  ultima_parcela: boolean
  saldo_rotativo: boolean
  resumo_semanal: boolean
}

export const NOTIFICATION_PREFS_KEY = 'ff_notification_prefs'

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  contas_vencidas: true,
  contas_a_vencer: true,
  faturas_fechadas: true,
  orcamento_80: true,
  orcamento_100: true,
  recorrentes_geradas: false,
  ultima_parcela: true,
  saldo_rotativo: true,
  resumo_semanal: false,
}

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS }
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS }
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* intentionally ignored */
  }
}

type TabKey = 'todas' | 'nao_lidas' | 'vencimentos' | 'orcamento' | 'faturas'

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days}d`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getDateGroupKey(ts: number): 'Hoje' | 'Ontem' | 'Esta semana' | 'Anteriores' {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
  const thisWeekStart = todayStart - 6 * 24 * 60 * 60 * 1000

  if (ts >= todayStart) return 'Hoje'
  if (ts >= yesterdayStart) return 'Ontem'
  if (ts >= thisWeekStart) return 'Esta semana'
  return 'Anteriores'
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotificationsStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('todas')
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadNotificationPrefs)
  const [tempPrefs, setTempPrefs] = useState<NotificationPrefs>(loadNotificationPrefs)
  const [configOpen, setConfigOpen] = useState(false)

  const openConfigDialog = () => {
    setTempPrefs(loadNotificationPrefs())
    setConfigOpen(true)
  }

  const handleToggleTempPref = (key: keyof NotificationPrefs, checked: boolean) => {
    setTempPrefs((prev) => ({ ...prev, [key]: checked }))
  }

  const handleSavePrefs = () => {
    setPrefs(tempPrefs)
    saveNotificationPrefs(tempPrefs)
    setConfigOpen(false)
    toast({
      title: 'Preferências salvas',
      description: 'Suas configurações de alertas foram atualizadas.',
    })
  }

  const counts = useMemo(() => {
    const naoLidas = notifications.filter((n) => !n.read).length
    const vencimentos = notifications.filter(
      (n) =>
        n.type === 'bill_overdue' ||
        n.type === 'bill_due' ||
        n.type === 'last_installment' ||
        n.title.toLowerCase().includes('vence') ||
        n.title.toLowerCase().includes('vencida'),
    ).length
    const orcamento = notifications.filter(
      (n) =>
        n.type === 'budget_warning' ||
        n.type === 'budget_exceeded' ||
        n.title.toLowerCase().includes('orçamento'),
    ).length
    const faturas = notifications.filter(
      (n) =>
        n.type === 'invoice_ready' ||
        n.type === 'rotativo' ||
        n.title.toLowerCase().includes('fatura') ||
        n.title.toLowerCase().includes('rotativo'),
    ).length

    return {
      todas: notifications.length,
      nao_lidas: naoLidas,
      vencimentos,
      orcamento,
      faturas,
    }
  }, [notifications])

  const filtered = useMemo(() => {
    switch (tab) {
      case 'nao_lidas':
        return notifications.filter((n) => !n.read)
      case 'vencimentos':
        return notifications.filter(
          (n) =>
            n.type === 'bill_overdue' ||
            n.type === 'bill_due' ||
            n.type === 'last_installment' ||
            n.title.toLowerCase().includes('vence') ||
            n.title.toLowerCase().includes('vencida'),
        )
      case 'orcamento':
        return notifications.filter(
          (n) =>
            n.type === 'budget_warning' ||
            n.type === 'budget_exceeded' ||
            n.title.toLowerCase().includes('orçamento'),
        )
      case 'faturas':
        return notifications.filter(
          (n) =>
            n.type === 'invoice_ready' ||
            n.type === 'rotativo' ||
            n.title.toLowerCase().includes('fatura') ||
            n.title.toLowerCase().includes('rotativo'),
        )
      default:
        return notifications
    }
  }, [notifications, tab])

  const grouped = useMemo(() => {
    const groups: Record<'Hoje' | 'Ontem' | 'Esta semana' | 'Anteriores', AppNotification[]> = {
      Hoje: [],
      Ontem: [],
      'Esta semana': [],
      Anteriores: [],
    }

    for (const notif of filtered) {
      const g = getDateGroupKey(notif.timestamp)
      groups[g].push(notif)
    }

    return groups
  }, [filtered])

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
    }
  }

  const groupKeys: Array<'Hoje' | 'Ontem' | 'Esta semana' | 'Anteriores'> = [
    'Hoje',
    'Ontem',
    'Esta semana',
    'Anteriores',
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-[#166534] dark:text-emerald-400 shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">Notificações</h1>
              {/* Settings Cog Modal Trigger */}
              <Button
                variant="ghost"
                size="icon"
                onClick={openConfigDialog}
                className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg"
                title="Configurações de notificações"
                aria-label="Abrir configurações de notificações"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fique por dentro dos seus alertas e avisos
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="self-start sm:self-auto gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap">
          <TabsTrigger value="todas" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Todas
            {counts.todas > 0 && <Badge variant="secondary">{counts.todas}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="nao_lidas" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Não lidas
            {counts.nao_lidas > 0 && (
              <Badge className="bg-blue-600 text-white hover:bg-blue-600">{counts.nao_lidas}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vencimentos" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Vencimentos
            {counts.vencimentos > 0 && <Badge variant="secondary">{counts.vencimentos}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="orcamento" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Orçamento
            {counts.orcamento > 0 && <Badge variant="secondary">{counts.orcamento}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="faturas" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Faturas
            {counts.faturas > 0 && <Badge variant="secondary">{counts.faturas}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <CardContent className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[#166534] dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-foreground text-sm">
              Você está em dia ✓
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {tab === 'todas'
                ? 'Nenhum alerta recente no momento.'
                : 'Nenhuma notificação encontrada neste filtro.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((groupKey) => {
            const items = grouped[groupKey]
            if (items.length === 0) return null
            return (
              <div key={groupKey} className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                  {groupKey}
                </h2>
                <div className="space-y-2">
                  {items.map((notif) => (
                    <Card
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        'border transition-colors cursor-pointer rounded-2xl bg-white dark:bg-card shadow-subtle hover:border-emerald-300 dark:hover:border-emerald-700',
                        !notif.read
                          ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10'
                          : 'border-gray-100 dark:border-gray-800',
                      )}
                    >
                      <CardContent className="p-3.5 flex items-center gap-3">
                        {/* Unread indicator dot */}
                        <div className="w-2.5 h-2.5 flex items-center justify-center shrink-0">
                          {!notif.read ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                          )}
                        </div>

                        {/* Color circle */}
                        <div
                          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-xs"
                          style={{ backgroundColor: notif.iconColor || '#166534' }}
                        >
                          <Bell className="h-4 w-4" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={cn(
                                'text-sm font-semibold truncate',
                                !notif.read
                                  ? 'text-gray-900 dark:text-foreground font-bold'
                                  : 'text-gray-700 dark:text-gray-300',
                              )}
                            >
                              {notif.title}
                            </p>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                              · {formatRelativeTime(notif.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {notif.description}
                          </p>
                        </div>

                        {/* Action CTA */}
                        {notif.link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-8 px-2.5 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 gap-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(notif)
                            }}
                          >
                            <span>{notif.actionLabel || 'Ver'}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Settings Modal (Dialog) */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Settings className="h-5 w-5 text-[#166534] dark:text-emerald-400" />
              Configurações de Alertas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escolha quais tipos de notificações e alertas automáticos você deseja receber.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 divide-y divide-gray-100 dark:divide-gray-800">
            <div className="pt-2 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-vencidas" className="text-sm font-medium">
                  Contas vencidas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Alertar imediatamente sobre contas com vencimento expirado
                </p>
              </div>
              <Switch
                id="pref-vencidas"
                checked={tempPrefs.contas_vencidas}
                onCheckedChange={(c) => handleToggleTempPref('contas_vencidas', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-vencer" className="text-sm font-medium">
                  Contas a vencer
                </Label>
                <p className="text-xs text-muted-foreground">
                  Avisos 3 dias antes, na véspera e no dia do vencimento
                </p>
              </div>
              <Switch
                id="pref-vencer"
                checked={tempPrefs.contas_a_vencer}
                onCheckedChange={(c) => handleToggleTempPref('contas_a_vencer', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-faturas" className="text-sm font-medium">
                  Faturas fechadas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Avisar quando a fatura do cartão fechar para conferência
                </p>
              </div>
              <Switch
                id="pref-faturas"
                checked={tempPrefs.faturas_fechadas}
                onCheckedChange={(c) => handleToggleTempPref('faturas_fechadas', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-orc80" className="text-sm font-medium">
                  Orçamento 80%
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aviso preventivo quando uma categoria atingir 80% do teto
                </p>
              </div>
              <Switch
                id="pref-orc80"
                checked={tempPrefs.orcamento_80}
                onCheckedChange={(c) => handleToggleTempPref('orcamento_80', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-orc100" className="text-sm font-medium">
                  Orçamento 100%
                </Label>
                <p className="text-xs text-muted-foreground">
                  Alerta urgente quando o limite da categoria for ultrapassado
                </p>
              </div>
              <Switch
                id="pref-orc100"
                checked={tempPrefs.orcamento_100}
                onCheckedChange={(c) => handleToggleTempPref('orcamento_100', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-recorrentes" className="text-sm font-medium">
                  Recorrentes geradas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Confirmar quando uma transação recorrente for lançada
                </p>
              </div>
              <Switch
                id="pref-recorrentes"
                checked={tempPrefs.recorrentes_geradas}
                onCheckedChange={(c) => handleToggleTempPref('recorrentes_geradas', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-ultima" className="text-sm font-medium">
                  Última parcela
                </Label>
                <p className="text-xs text-muted-foreground">
                  Notificar quando um parcelamento ou financiamento chegar ao fim
                </p>
              </div>
              <Switch
                id="pref-ultima"
                checked={tempPrefs.ultima_parcela}
                onCheckedChange={(c) => handleToggleTempPref('ultima_parcela', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-rotativo" className="text-sm font-medium">
                  Saldo rotativo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Alerta de juros ao pagar valor parcial da fatura
                </p>
              </div>
              <Switch
                id="pref-rotativo"
                checked={tempPrefs.saldo_rotativo}
                onCheckedChange={(c) => handleToggleTempPref('saldo_rotativo', c)}
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <Label htmlFor="pref-resumo" className="text-sm font-medium">
                  Resumo semanal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receber compilado dos gastos e metas todo domingo
                </p>
              </div>
              <Switch
                id="pref-resumo"
                checked={tempPrefs.resumo_semanal}
                onCheckedChange={(c) => handleToggleTempPref('resumo_semanal', c)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePrefs} className="bg-[#166534] hover:bg-[#15803D]">
              Salvar preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
