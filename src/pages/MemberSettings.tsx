import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Loader2, Users } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useRealtime } from '@/hooks/use-realtime'
import { getActiveMembersByFamilyId, updateMember } from '@/services/members'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getMemberAvatarUrl } from '@/lib/member-utils'
import { getRoleLabel, type MemberRecord, type AccessLevel } from '@/types/finance'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'

const ACCESS_LEVELS: { value: AccessLevel; label: string; description: string }[] = [
  { value: 'guardian', label: 'Guardião', description: 'Acesso total ao app' },
  { value: 'co_admin', label: 'Co-administrador', description: 'Permissões personalizadas' },
  { value: 'member', label: 'Membro', description: 'Apenas seus próprios dados' },
  { value: 'guest', label: 'Convidado', description: 'Acesso restrito' },
]

const PERM_FIELDS: { key: keyof MemberRecord; label: string }[] = [
  { key: 'perm_view_others', label: 'Ver transações de outros membros' },
  { key: 'perm_edit_others', label: 'Editar transações de outros membros' },
  { key: 'perm_view_patrimony', label: 'Ver Patrimônio' },
  { key: 'perm_view_budgets', label: 'Ver Orçamentos' },
  { key: 'perm_import_invoices', label: 'Importar faturas' },
  { key: 'perm_delete_transactions', label: 'Excluir transações' },
  { key: 'perm_delete_invoices', label: 'Excluir faturas' },
  { key: 'perm_manage_debts', label: 'Cadastrar dívidas/contas fixas' },
  { key: 'perm_manage_members', label: 'Gerenciar membros' },
]

const ALL_PERMS_TRUE = PERM_FIELDS.reduce(
  (acc, p) => ({ ...acc, [p.key]: true }),
  {} as Record<string, boolean>,
)
const ALL_PERMS_FALSE = PERM_FIELDS.reduce(
  (acc, p) => ({ ...acc, [p.key]: false }),
  {} as Record<string, boolean>,
)

function levelLabel(level: AccessLevel | undefined) {
  return ACCESS_LEVELS.find((l) => l.value === level)?.label || 'Membro'
}

export default function MemberSettings() {
  const navigate = useNavigate()
  const { family, member: currentUser } = useAuth()
  const perms = usePermissions()
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadMembers = async () => {
    if (!family) return
    try {
      setMembers(await getActiveMembersByFamilyId(family.id))
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [family?.id])
  useRealtime('members', () => {
    loadMembers()
  })

  const updateMemberState = (id: string, patch: Partial<MemberRecord>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  const handleLevelChange = async (m: MemberRecord, level: AccessLevel) => {
    if (m.access_level === 'guardian' && m.user_id === family?.created_by) {
      // Guardião (criador da família) não pode ter nível alterado
      return
    }

    const permPatch =
      level === 'co_admin' || level === 'guardian' ? { ...ALL_PERMS_TRUE } : { ...ALL_PERMS_FALSE }

    updateMemberState(m.id, { access_level: level, ...permPatch } as Partial<MemberRecord>)

    setSavingId(m.id)
    try {
      await updateMember(m.id, {
        access_level: level,
        ...(permPatch as Partial<MemberRecord>),
      })
      toast({ title: `${m.display_name}: nível atualizado para ${levelLabel(level)}` })
    } catch (err) {
      // Reverte em caso de erro
      updateMemberState(m.id, { access_level: m.access_level })
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSavingId(null)
    }
  }

  const handlePermToggle = async (m: MemberRecord, field: keyof MemberRecord, checked: boolean) => {
    updateMemberState(m.id, { [field]: checked } as Partial<MemberRecord>)
    setSavingId(m.id)
    try {
      await updateMember(m.id, { [field]: checked } as Partial<MemberRecord>)
    } catch (err) {
      updateMemberState(m.id, { [field]: !checked } as Partial<MemberRecord>)
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSavingId(null)
    }
  }

  if (!family) return null

  if (!perms.canManageMembers()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <Shield className="h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-500">Você não tem permissão para acessar esta tela.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          Voltar ao início
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Membros</h1>
          <p className="text-xs text-gray-500">
            Defina o nível de acesso e permissões de cada membro da família.
          </p>
        </div>
      </div>

      <Card className="border border-emerald-200 bg-emerald-50 rounded-2xl">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-[#166534] shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800 space-y-1">
            <p className="font-semibold">Como funcionam os níveis</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>
                <strong>Guardião</strong>: acesso total (não pode ser alterado pelo criador da
                família).
              </li>
              <li>
                <strong>Co-administrador</strong>: permissões personalizáveis, todas ativadas por
                padrão.
              </li>
              <li>
                <strong>Membro</strong>: vê e edita apenas seus próprios dados.
              </li>
              <li>
                <strong>Convidado</strong>: acesso restrito.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Carregando" aria-busy="true">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <Users className="h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-500">Nenhum membro cadastrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const isGuardianCreator =
              m.access_level === 'guardian' && m.user_id === family?.created_by
            const isSelf = m.id === currentUser?.id
            const showPerms = m.access_level === 'co_admin' || m.access_level === 'guardian'
            const isSaving = savingId === m.id

            return (
              <Card
                key={m.id}
                className="border border-gray-100 shadow-subtle rounded-2xl bg-white"
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-11 w-11 border-2 border-[#22C55E] shrink-0">
                        <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                        <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                          {m.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 truncate">
                          {m.display_name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-gray-400">(você)</span>
                          )}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {getRoleLabel(m.role)}
                          {m.email ? ` • ${m.email}` : ''}
                        </span>
                      </div>
                    </div>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">Nível de acesso</Label>
                    <Select
                      value={m.access_level || 'member'}
                      onValueChange={(v) => handleLevelChange(m, v as AccessLevel)}
                      disabled={isGuardianCreator}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESS_LEVELS.map((lvl) => (
                          <SelectItem key={lvl.value} value={lvl.value}>
                            <span className="font-medium">{lvl.label}</span>
                            <span className="text-xs text-gray-400 ml-1">— {lvl.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isGuardianCreator && (
                      <p className="text-[11px] text-gray-400">
                        O Guardião criador da família não pode ter seu nível alterado.
                      </p>
                    )}
                  </div>

                  {showPerms ? (
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <div className="flex items-center justify-between pt-2">
                        <Label className="text-xs font-semibold text-gray-700">
                          Permissões específicas
                        </Label>
                        {m.access_level === 'guardian' ? (
                          <Badge className="bg-emerald-100 text-[#166534] text-[10px]">
                            Todas ativadas
                          </Badge>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERM_FIELDS.map((perm) => {
                          const checked = !!m[perm.key]
                          const disabled = m.access_level === 'guardian'
                          return (
                            <label
                              key={String(perm.key)}
                              className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={(v) => handlePermToggle(m, perm.key, v === true)}
                                className="mt-0.5"
                              />
                              <span className="text-xs text-gray-700 leading-tight">
                                {perm.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                      {m.access_level === 'guardian' && (
                        <p className="text-[11px] text-gray-400">
                          Guardiões têm todas as permissões ativadas por padrão.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 border-t border-gray-100">
                      <p className="text-xs text-gray-400 pt-2">
                        Membros e Convidados não possuem permissões específicas — seu acesso é
                        limitado aos próprios dados.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
