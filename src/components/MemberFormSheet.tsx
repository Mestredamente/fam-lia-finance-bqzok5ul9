import { useState, useEffect, useRef } from 'react'
import { Loader2, Camera, X } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/CurrencyInput'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createMember, updateMember } from '@/services/members'
import { createInvite, generateInviteCode } from '@/services/invites'
import { useAnnouncer } from '@/hooks/use-announcer'
import { roleGroups, getMemberAvatarUrl } from '@/lib/member-utils'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import type { MemberRecord, MemberRole } from '@/types/finance'

const schema = z
  .object({
    display_name: z.string().min(2, 'Nome muito curto'),
    role: z.string().min(1, 'Selecione um papel'),
    birth_date: z.string().optional(),
    is_dependent: z.boolean(),
    email: z.string().optional(),
    occupation: z.string().optional(),
    monthly_income: z.number(),
    monthly_allowance: z.number(),
    send_invite: z.boolean(),
  })
  .refine((d) => !(!d.is_dependent && d.send_invite && !d.email), {
    message: 'Email obrigatório para envio de convite',
    path: ['email'],
  })
  .refine(
    (d) =>
      !(!d.is_dependent && d.send_invite && d.email) ||
      z.string().email().safeParse(d.email).success,
    { message: 'Email inválido', path: ['email'] },
  )

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  creatorId: string
  editingMember?: MemberRecord | null
  isCreatorRoleLocked?: boolean
  canEditRole?: boolean
  onSaved?: (inviteCode?: string) => void
}

export function MemberFormSheet({
  open,
  onOpenChange,
  familyId,
  creatorId,
  editingMember,
  isCreatorRoleLocked,
  canEditRole = true,
  onSaved,
}: Props) {
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<MemberRole>('husband')
  const [birthDate, setBirthDate] = useState('')
  const [isDependent, setIsDependent] = useState(false)
  const [email, setEmail] = useState('')
  const [occupation, setOccupation] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyAllowance, setMonthlyAllowance] = useState(0)
  const [sendInvite, setSendInvite] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [originalRole, setOriginalRole] = useState<MemberRole>('husband')
  const { announce } = useAnnouncer()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (editingMember) {
        setDisplayName(editingMember.display_name)
        setRole(editingMember.role)
        setOriginalRole(editingMember.role)
        setBirthDate(
          editingMember.birth_date ? editingMember.birth_date.split(' ')[0].split('T')[0] : '',
        )
        setIsDependent(editingMember.is_dependent ?? false)
        setEmail(editingMember.email || '')
        setOccupation(editingMember.occupation || '')
        setMonthlyIncome(editingMember.monthly_income ?? 0)
        setMonthlyAllowance(editingMember.monthly_allowance ?? 0)
        setSendInvite(false)
        setAvatarPreview(getMemberAvatarUrl(editingMember))
      } else {
        setDisplayName('')
        setRole('husband')
        setBirthDate('')
        setIsDependent(false)
        setEmail('')
        setOccupation('')
        setMonthlyIncome(0)
        setMonthlyAllowance(0)
        setSendInvite(true)
        setAvatarPreview(undefined)
      }
      setErrors({})
      setAvatarFile(null)
      setRemoveAvatar(false)
    }
  }, [open, editingMember])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      setRemoveAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(undefined)
    setRemoveAvatar(true)
  }

  const handleSave = async () => {
    const result = schema.safeParse({
      display_name: displayName,
      role,
      birth_date: birthDate || undefined,
      is_dependent: isDependent,
      email: email || undefined,
      occupation: occupation || undefined,
      monthly_income: monthlyIncome,
      monthly_allowance: monthlyAllowance,
      send_invite: sendInvite,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        errs[i.path[0]] = i.message
      })
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const memberData: Partial<MemberRecord> = {
        family_id: familyId,
        display_name: displayName,
        role,
        birth_date: birthDate || null,
        is_dependent: isDependent,
        email: email || '',
        occupation: occupation || null,
        monthly_income: monthlyIncome || null,
        monthly_allowance: monthlyAllowance || null,
        is_active: true,
      }
      let memberId: string
      let inviteCode: string | undefined
      if (editingMember) {
        await updateMember(editingMember.id, memberData)
        memberId = editingMember.id
        if (role !== originalRole) {
          toast({ title: 'Papel familiar atualizado com sucesso' })
          announce('Membro atualizado')
        } else {
          toast({ title: 'Membro atualizado' })
          announce('Membro atualizado')
        }
      } else {
        const created = await createMember(memberData)
        memberId = created.id
        if (!isDependent && sendInvite) {
          inviteCode = generateInviteCode()
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)
          await createInvite({
            family_id: familyId,
            invite_code: inviteCode,
            created_by: creatorId,
            expires_at: expiresAt.toISOString(),
          })
        }
        toast({ title: 'Membro adicionado com sucesso' })
        announce('Membro adicionado')
      }

      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        const updated = await pb.collection('members').update<MemberRecord>(memberId, formData)
        if (updated.avatar) {
          const avatarUrl = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/members/${memberId}/${updated.avatar}`
          await updateMember(memberId, { avatar_url: avatarUrl })
        }
      } else if (removeAvatar && editingMember) {
        await pb.collection('members').update(memberId, { avatar: null })
        await updateMember(memberId, { avatar_url: null })
      }

      onOpenChange(false)
      onSaved?.(inviteCode)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
      announce('Erro: ' + getPortugueseError(err), 'assertive')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingMember ? 'Editar membro' : 'Adicionar membro'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-[#22C55E]">
                <AvatarImage src={avatarPreview} alt={displayName} />
                <AvatarFallback className="bg-emerald-100 text-[#166534] text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              {avatarPreview && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-4 w-4 mr-2" />
              {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Nome</Label>
            <Input
              placeholder="Nome do membro"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={errors.display_name ? 'border-red-500' : ''}
            />
            {errors.display_name && (
              <p role="alert" aria-live="assertive" className="text-xs text-red-500 mt-1">
                {errors.display_name}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Papel no domicílio</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as MemberRole)}
              disabled={isCreatorRoleLocked || !canEditRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {roleGroups.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Data de nascimento</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <Label className="text-xs font-semibold text-gray-700">É dependente?</Label>
            <Switch checked={isDependent} onCheckedChange={setIsDependent} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">
              Email{isDependent ? ' (opcional)' : ''}
            </Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p role="alert" aria-live="assertive" className="text-xs text-red-500 mt-1">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Ocupação</Label>
            <Input
              placeholder="Ex: Estudante, Aposentado, CLT..."
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Renda mensal</Label>
            <CurrencyInput value={monthlyIncome} onChange={setMonthlyIncome} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Mesada</Label>
            <CurrencyInput value={monthlyAllowance} onChange={setMonthlyAllowance} />
          </div>
          {!isDependent && !editingMember && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <Label className="text-xs font-semibold text-gray-700">
                Enviar convite para acesso ao app
              </Label>
              <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !displayName || displayName.length < 2}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
