import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ArrowLeft, Users } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MemberFormSheet } from '@/components/MemberFormSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { getActiveMembersByFamilyId, softDeleteMember } from '@/services/members'
import { calculateAge, formatAge, getMemberAvatarUrl } from '@/lib/member-utils'
import { getRoleLabel, type MemberRecord } from '@/types/finance'
import { formatBRL } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { EmptyState } from '@/components/EmptyState'

export default function FamilyManagement() {
  const navigate = useNavigate()
  const { family, user, member } = useAuth()
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null)
  const [removingMember, setRemovingMember] = useState<MemberRecord | null>(null)
  const [removing, setRemoving] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const isCreator = family?.created_by === user?.id

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

  const handleAdd = () => {
    setEditingMember(null)
    setFormOpen(true)
  }
  const handleEdit = (m: MemberRecord) => {
    setEditingMember(m)
    setFormOpen(true)
  }
  const handleRemove = async () => {
    if (!removingMember) return
    setRemoving(true)
    try {
      await softDeleteMember(removingMember.id)
      toast({ title: 'Membro desativado' })
      setRemovingMember(null)
      loadMembers()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setRemoving(false)
    }
  }
  const handleSaved = (code?: string) => {
    loadMembers()
    if (code) {
      setInviteCode(code)
      setInviteOpen(true)
    }
  }

  const canEdit = (m: MemberRecord) => isCreator || m.user_id === user?.id

  if (!family) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate('/profile')}
          className="h-9 w-9 p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
            Gerenciar Domicílio
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Adicione, edite ou remova membros
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {members.length} {members.length === 1 ? 'membro' : 'membros'}
          {members.some((m) => m.is_dependent) &&
            ` • ${members.filter((m) => m.is_dependent).length} dependentes`}
        </span>
        {isCreator && (
          <Button
            onClick={handleAdd}
            className="h-9 px-3 py-2 rounded-lg text-sm bg-[#166534] hover:bg-[#15803D] text-white"
          >
            <Plus className="h-4 w-4" />
            Adicionar membro
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Carregando" aria-busy="true">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Nenhum membro cadastrado"
          description="Adicione membros para gerenciar seu domicílio."
          actionLabel={isCreator ? 'Adicionar membro' : undefined}
          onAction={isCreator ? handleAdd : undefined}
        />
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const age = calculateAge(m.birth_date)
            return (
              <Card
                key={m.id}
                className="border border-gray-100 shadow-subtle rounded-2xl bg-white"
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-11 w-11 border-2 border-[#22C55E] shrink-0">
                      <AvatarImage src={getMemberAvatarUrl(m)} alt={m.display_name} />
                      <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                        {m.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{m.display_name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{getRoleLabel(m.role)}</span>
                        {age !== null && (
                          <span className="text-xs text-gray-400">• {formatAge(m.birth_date)}</span>
                        )}
                        {m.occupation && (
                          <span className="text-xs text-gray-400">• {m.occupation}</span>
                        )}
                      </div>
                      {m.email && (
                        <span className="text-xs text-gray-400 truncate block">{m.email}</span>
                      )}
                      {m.monthly_income ? (
                        <span className="text-xs font-medium text-[#166534]">
                          {formatBRL(m.monthly_income)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!m.is_active && (
                      <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">
                        Inativo
                      </Badge>
                    )}
                    {m.is_dependent && (
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">
                        Dependente
                      </Badge>
                    )}
                    {canEdit(m) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(m)}
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                    )}
                    {isCreator && m.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setRemovingMember(m)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <MemberFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        familyId={family.id}
        creatorId={user?.id || ''}
        editingMember={editingMember}
        isCreatorRoleLocked={editingMember?.user_id === family.created_by}
        canEditRole={isCreator}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!removingMember} onOpenChange={(v) => !v && setRemovingMember(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tem certeza que deseja desativar {removingMember?.display_name} da família?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              O membro será desativado e não aparecerá mais nos listas e relatórios da família. Os
              dados financeiros associados serão mantidos para histórico. Esta ação pode ser
              revertida pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removing ? 'Desativando...' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteCodeDialog open={inviteOpen} onOpenChange={setInviteOpen} code={inviteCode || ''} />
    </div>
  )
}
