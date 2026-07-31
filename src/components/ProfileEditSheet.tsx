import { useState, useEffect, useRef } from 'react'
import { Loader2, Camera, X } from 'lucide-react'
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
import { roleGroups } from '@/lib/member-utils'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import type { MemberRecord, MemberRole } from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileEditSheet({ open, onOpenChange }: Props) {
  const { user, member, updateMemberData, refreshData } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [payday, setPayday] = useState<number | ''>('')
  const [occupation, setOccupation] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [role, setRole] = useState<MemberRole>('other')
  const [notifyBills, setNotifyBills] = useState(false)
  const [notifyAiTips, setNotifyAiTips] = useState(false)
  const [shareData, setShareData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setDisplayName(member?.display_name || user?.name || '')
      setAvatarFile(null)
      setAvatarPreview(
        user?.avatar
          ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${user.avatar}`
          : undefined,
      )
      setRemoveAvatar(false)
      setMonthlyIncome(member?.monthly_income ?? 0)
      setPayday(member?.payday ?? '')
      setOccupation(member?.occupation || '')
      setBirthDate(member?.birth_date ? member.birth_date.split(' ')[0].split('T')[0] : '')
      setRole(member?.role || 'other')
      setNotifyBills(member?.notify_bills ?? false)
      setNotifyAiTips(member?.notify_ai_tips ?? false)
      setShareData(member?.share_data ?? false)
      setErrors({})
    }
  }, [open, member, user])

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
    if (!member) return
    setSaving(true)
    setErrors({})
    try {
      const memberData: Partial<MemberRecord> = {
        display_name: displayName,
        role,
        monthly_income: monthlyIncome || null,
        payday: payday === '' ? null : payday,
        occupation: occupation || null,
        birth_date: birthDate || null,
        notify_bills: notifyBills,
        notify_ai_tips: notifyAiTips,
        share_data: shareData,
      }

      if (user) {
        const userData: Record<string, unknown> = {}
        if (displayName !== (user.name || '')) {
          userData.name = displayName
        }
        if (avatarFile) {
          userData.avatar = avatarFile
        } else if (removeAvatar) {
          userData.avatar = null
        }
        if (Object.keys(userData).length > 0) {
          const updatedUser = await pb.collection('users').update(user.id, userData)
          await pb.collection('users').authRefresh()
          if (avatarFile && (updatedUser as Record<string, unknown>).avatar) {
            memberData.avatar_url = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${user.id}/${(updatedUser as Record<string, unknown>).avatar}`
          } else if (removeAvatar) {
            memberData.avatar_url = null
          }
        }
      }

      await updateMemberData(memberData)
      await refreshData()

      toast({ title: 'Perfil atualizado', description: 'Suas alterações foram salvas.' })
      onOpenChange(false)
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar. Verifique os campos.',
      })
    } finally {
      setSaving(false)
    }
  }

  const avatarFallback = displayName.charAt(0).toUpperCase() || '?'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Editar perfil</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-[#22C55E]">
                <AvatarImage src={avatarPreview} alt={displayName} />
                <AvatarFallback className="bg-emerald-100 text-[#166534] text-2xl font-bold">
                  {avatarFallback}
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
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Nome</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={errors.display_name || errors.name ? 'border-red-500' : ''}
            />
            {errors.display_name && (
              <p className="text-xs text-red-500 mt-1">{errors.display_name}</p>
            )}
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Papel no domicílio</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
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
            <Label className="text-xs font-semibold text-gray-700">Renda mensal</Label>
            <CurrencyInput value={monthlyIncome} onChange={setMonthlyIncome} />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Dia de recebimento</Label>
            <Input
              type="number"
              min={1}
              max={31}
              placeholder="Ex: 5"
              value={payday}
              onChange={(e) =>
                setPayday(
                  e.target.value === ''
                    ? ''
                    : Math.min(31, Math.max(1, parseInt(e.target.value) || 0)),
                )
              }
              className={errors.payday ? 'border-red-500' : ''}
            />
            {errors.payday && <p className="text-xs text-red-500 mt-1">{errors.payday}</p>}
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Ocupação</Label>
            <Input
              placeholder="Ex: Engenheiro, Estudante..."
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-700">Data de nascimento</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <Label className="text-xs font-semibold text-gray-700">
                Notificações de vencimento
              </Label>
              <Switch checked={notifyBills} onCheckedChange={setNotifyBills} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <Label className="text-xs font-semibold text-gray-700">Dicas da IA consultora</Label>
              <Switch checked={notifyAiTips} onCheckedChange={setNotifyAiTips} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <Label className="text-xs font-semibold text-gray-700">
                Compartilhar dados com quem mora com você
              </Label>
              <Switch checked={shareData} onCheckedChange={setShareData} />
            </div>
          </div>

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
              'Salvar alterações'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
