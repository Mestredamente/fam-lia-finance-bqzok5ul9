import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, ShieldAlert, Download, Trash2, LogOut, Key, Info } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
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
import { MemberRecord, getRoleLabel } from '@/types/finance'
import { getMembersByFamilyId } from '@/services/members'
import { createInvite, generateInviteCode } from '@/services/invites'
import { toast } from '@/hooks/use-toast'

export default function Profile() {
  const navigate = useNavigate()
  const { user, member, family, signOut, deleteAccount, updateMemberData } = useAuth()

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState(family?.invite_code || 'FAM-0000')
  const [familyMembers, setFamilyMembers] = useState<MemberRecord[]>([])

  const loadMembers = async () => {
    if (!family) return
    try {
      const data = await getMembersByFamilyId(family.id)
      setFamilyMembers(data)
    } catch {
      setFamilyMembers([])
    }
  }

  useEffect(() => {
    loadMembers()
  }, [family?.id])

  useRealtime('members', () => {
    loadMembers()
  })

  if (!user) return null

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const avatarUrl = user.avatar
    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`
    : undefined

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
    await deleteAccount()
    toast({ title: 'Conta excluída', description: 'Sua conta foi removida com sucesso.' })
    navigate('/')
  }

  const handleLogout = () => {
    signOut()
    toast({ title: 'Até logo!', description: 'Você saiu da sua conta.' })
    navigate('/')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Perfil do Usuário</h1>

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => toast({ title: 'Em breve', description: 'Edição de perfil em breve.' })}
          >
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
              <span className="text-xs text-gray-500 block">Renda mensal individual</span>
              <span className="text-base font-bold text-[#166534]">
                {formatBRL(member?.monthly_income || 0)}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Dia de recebimento</span>
              <span className="text-base font-bold text-gray-900">Dia {member?.payday || '-'}</span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Total investido</span>
              <span className="text-base font-bold text-blue-600">{formatBRL(0)}</span>
              <span className="text-[10px] text-gray-400 block">
                Nenhum investimento cadastrado
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-500 block">Total em dívidas</span>
              <span className="text-base font-bold text-red-600">{formatBRL(0)}</span>
              <span className="text-[10px] text-gray-400 block">Nenhuma dívida cadastrada</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h3 className="font-bold text-base text-gray-900">{family?.name || 'Sua Família'}</h3>
              <span className="text-xs text-gray-500">Membros cadastrados</span>
            </div>
            <Button
              size="sm"
              onClick={handleGenerateInvite}
              className="bg-[#166534] hover:bg-[#15803D] text-white"
            >
              <Key className="h-4 w-4 mr-1.5" />
              Gerar novo convite
            </Button>
          </div>

          <div className="space-y-3">
            {familyMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                      {m.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{m.display_name}</h4>
                    <span className="text-[10px] text-gray-500">{getRoleLabel(m.role)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white">
                  <UserCheck className="h-3 w-3 mr-1 text-[#22C55E]" />
                  Ativo
                </Badge>
              </div>
            ))}
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
                  Compartilhar dados com cônjuge
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-48 text-[11px]">
                      Quando ativado, seu cônjuge pode ver suas transações, investimentos e dívidas.
                    </p>
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
        <CardContent className="p-6 space-y-3">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-2">
            Ações de Conta
          </h3>

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
    </div>
  )
}
