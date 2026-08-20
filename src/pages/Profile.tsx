import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserCheck,
  ShieldAlert,
  Shield,
  Download,
  Trash2,
  LogOut,
  Key,
  Info,
  Users,
  BookOpen,
  Smartphone,
  Tags,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { InstallAppDialog } from '@/components/InstallAppDialog'
import { ProfileEditSheet } from '@/components/ProfileEditSheet'
import { MemberRecord, TransactionRecord, getRoleLabel } from '@/types/finance'
import { getActiveMembersByFamilyId } from '@/services/members'
import { calculateAge, formatAge, getMemberAvatarUrl } from '@/lib/member-utils'
import { getTransactionsByMember } from '@/services/transactions'
import { createInvite, generateInviteCode } from '@/services/invites'
import { getInvestmentsByOwner } from '@/services/investments'
import { getDebtsByOwner } from '@/services/debts'
import type { InvestmentRecord, DebtRecord } from '@/types/finance'
import { toast } from '@/hooks/use-toast'
import { formatBRL, getMonthName, getProgressBarColor, cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const { user, member, family, signOut, deleteAccount, updateMemberData } = useAuth()
  const perms = usePermissions()
  const canManageMembers = perms.canManageMembers()
  const { theme, setTheme } = useTheme()

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState(family?.invite_code || 'FAM-0000')
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<MemberRecord[]>([])
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([])
  const [userInvestments, setUserInvestments] = useState<InvestmentRecord[]>([])
  const [userDebts, setUserDebts] = useState<DebtRecord[]>([])

  const loadMembers = async () => {
    if (!family) return
    try {
      setFamilyMembers(await getActiveMembersByFamilyId(family.id))
    } catch {
      setFamilyMembers([])
    }
  }

  const loadTransactions = async () => {
    if (!member) return
    try {
      setAllTransactions(await getTransactionsByMember(member.id))
    } catch {
      setAllTransactions([])
    }
  }

  const loadInvestments = async () => {
    if (!member) return
    try {
      setUserInvestments(await getInvestmentsByOwner(member.id))
    } catch {
      setUserInvestments([])
    }
  }

  const loadUserDebts = async () => {
    if (!member) return
    try {
      setUserDebts(await getDebtsByOwner(member.id))
    } catch {
      setUserDebts([])
    }
  }

  useEffect(() => {
    loadMembers()
  }, [family?.id])
  useEffect(() => {
    loadTransactions()
    loadInvestments()
    loadUserDebts()
  }, [member?.id])
  useRealtime('members', () => {
    loadMembers()
  })
  useRealtime('transactions', () => {
    loadTransactions()
  })
  useRealtime('investments', () => {
    loadInvestments()
  })
  useRealtime('debts', () => {
    loadUserDebts()
  })

  if (!user) return null

  const avatarUrl = user.avatar
    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`
    : undefined

  const totalInvested = userInvestments
    .filter((i) => i.is_active)
    .reduce((s, i) => s + i.current_value, 0)
  const totalDebts = userDebts
    .filter((d) => d.is_active)
    .reduce((s, d) => s + d.remaining_amount, 0)
  const individualNetWorth = totalInvested - totalDebts
  const totalTransactions = allTransactions.length

  const now = new Date()
  const currentMonthTx = allTransactions.filter((t) => {
    const d = new Date(t.transaction_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthReceitas = currentMonthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const monthDespesas = currentMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const monthSaldo = monthReceitas - monthDespesas
  const monthRatio = monthReceitas > 0 ? Math.min((monthDespesas / monthReceitas) * 100, 100) : 0

  const handleGenerateInvite = async () => {
    if (!family || !user) return
    try {
      const code = generateInviteCode()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      await createInvite({
        family_id: family.id,
        invite_code: code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      setInviteCode(code)
      setInviteModalOpen(true)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível gerar o convite.',
      })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount()
      toast({ title: 'Conta excluída', description: 'Sua conta foi removida com sucesso.' })
      navigate('/')
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível excluir sua conta. Tente novamente.',
      })
    }
  }

  const handleLogout = () => {
    signOut()
    toast({ title: 'Até logo!', description: 'Você saiu da sua conta.' })
    navigate('/')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
        Perfil do Usuário
      </h1>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <Avatar className="h-20 w-20 border-4 border-[#22C55E]">
            <AvatarImage src={avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-emerald-100 text-[#166534] text-2xl font-bold">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
            {member && (
              <Badge className="bg-emerald-100 text-[#166534] hover:bg-emerald-100 mt-2 font-medium">
                {getRoleLabel(member.role)}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)}>
            Editar perfil
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2">
            Dados Financeiros
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-gray-500 block">
                Renda mensal individual
              </span>
              <span className="text-base font-bold text-[#166534]">
                {formatBRL(member?.monthly_income)}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 block">Dia de recebimento</span>
              <span className="text-base font-bold text-gray-900">Dia {member?.payday || '-'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 block">Total investido</span>
              <span className="text-base font-bold text-blue-600">{formatBRL(totalInvested)}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 block">Total em dívidas</span>
              <span className="text-base font-bold text-red-600">{formatBRL(totalDebts)}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 block">Patrimônio líquido</span>
              <span
                className={`text-base font-bold ${individualNetWorth >= 0 ? 'text-[#166534]' : 'text-red-600'}`}
              >
                {formatBRL(individualNetWorth)}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 block">Total de transações</span>
              <span className="text-base font-bold text-gray-900">{totalTransactions}</span>
            </div>{' '}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2">
            Resumo de {getMonthName(now.getMonth())}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <span className="text-xs font-medium text-gray-500 block">Receitas</span>
              <span className="text-sm font-bold text-[#166534]">{formatBRL(monthReceitas)}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-center">
              <span className="text-xs font-medium text-gray-500 block">Despesas</span>
              <span className="text-sm font-bold text-red-600">{formatBRL(monthDespesas)}</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <span className="text-xs font-medium text-gray-500 block">Saldo</span>
              <span className="text-sm font-bold text-blue-700">{formatBRL(monthSaldo)}</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${monthReceitas > 0 ? getProgressBarColor(monthRatio) : 'bg-gray-300'}`}
              style={{ width: `${monthRatio}%` }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/transacoes')}
          >
            Ver detalhes
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {family?.name || 'Seu Domicílio'}
              </h3>
              <span className="text-xs text-gray-500">Membros cadastrados</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManageMembers && (
                <Button
                  variant="secondary"
                  onClick={() => navigate('/membros')}
                  className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
                >
                  <Shield className="h-4 w-4" />
                  Permissões
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => navigate('/familia')}
                className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
              >
                <Users className="h-4 w-4" />
                Gerenciar
              </Button>
              <Button
                onClick={handleGenerateInvite}
                className="h-9 px-3 py-2 rounded-lg text-sm bg-[#166534] hover:bg-[#15803D] text-white"
              >
                <Key className="h-4 w-4" />
                Convite
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {familyMembers.map((m) => {
              const age = calculateAge(m.birth_date)
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                      <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                        {m.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900">{m.display_name}</h4>
                        {m.is_dependent && (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs px-1.5 py-0">
                            Dependente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">{getRoleLabel(m.role)}</span>
                        {age !== null && (
                          <span className="text-xs text-gray-400">• {formatAge(m.birth_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white">
                    <UserCheck className="h-3 w-3 mr-1 text-[#22C55E]" />
                    Ativo
                  </Badge>
                </div>
              )
            })}
          </div>
          <div className="text-xs text-gray-500 pt-1">
            {familyMembers.length} {familyMembers.length === 1 ? 'membro ativo' : 'membros ativos'}
            {familyMembers.some((m) => m.is_dependent) &&
              ` • ${familyMembers.filter((m) => m.is_dependent).length} dependentes`}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2">
            Preferências
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                Notificações de vencimento
              </span>
              <Switch
                checked={member?.notify_bills ?? false}
                onCheckedChange={(val) => updateMemberData({ notify_bills: val })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Dicas da IA consultora</span>
              <Switch
                checked={member?.notify_ai_tips ?? false}
                onCheckedChange={(val) => updateMemberData({ notify_ai_tips: val })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700">
                  Compartilhar dados com quem mora com você
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-48 text-[11px]">
                      Quando ativado, quem mora com você pode ver suas transações, investimentos e
                      dívidas.
                    </p>{' '}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={member?.share_data ?? false}
                onCheckedChange={(val) => updateMemberData({ share_data: val })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2">
            Aparência
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                theme === 'light' ? 'border-[#166534] bg-emerald-50' : 'border-gray-200',
              )}
            >
              <Sun className="h-5 w-5" />
              <span className="text-xs font-medium">Claro</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                theme === 'dark' ? 'border-[#166534] bg-emerald-50' : 'border-gray-200',
              )}
            >
              <Moon className="h-5 w-5" />
              <span className="text-xs font-medium">Escuro</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                theme === 'system' ? 'border-[#166534] bg-emerald-50' : 'border-gray-200',
              )}
            >
              <Monitor className="h-5 w-5" />
              <span className="text-xs font-medium">Sistema</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2">
            Ações de Conta
          </h3>
          <Button
            variant="outline"
            className="w-full justify-start text-gray-700 text-xs font-semibold"
            onClick={() => setInstallDialogOpen(true)}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Instalar app
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-gray-700 text-xs font-semibold"
            onClick={() => navigate('/regras-categorizacao')}
          >
            <Tags className="h-4 w-4 mr-2" />
            Regras de Categorização
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-gray-700 text-xs font-semibold"
            onClick={() => {
              localStorage.setItem('ff_tour_pending', 'true')
              navigate('/dashboard')
            }}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Rever tutorial
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-gray-700 text-xs font-semibold"
            onClick={() =>
              toast({
                title: 'Exportação LGPD',
                description: 'Relatório enviado para o seu e-mail.',
              })
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar meus dados (LGPD - Art. 18, V)
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                  Excluir conta definitivamente?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-gray-600">
                  Esta ação é irreversível. Todos os seus registros financeiros e preferências serão
                  apagados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900 text-xs font-semibold"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      <InviteCodeDialog
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        code={inviteCode}
      />
      <InstallAppDialog open={installDialogOpen} onOpenChange={setInstallDialogOpen} />
      <ProfileEditSheet open={editSheetOpen} onOpenChange={setEditSheetOpen} />
    </div>
  )
}
