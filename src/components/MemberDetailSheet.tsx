import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MemberRecord, getRoleLabel } from '@/types/finance'
import { formatBRL } from '@/lib/utils'

interface MemberDetailSheetProps {
  member: MemberRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberDetailSheet({ member, open, onOpenChange }: MemberDetailSheetProps) {
  if (!member) return null

  const balance = (member.monthly_income || 0) - 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
        <SheetHeader className="text-left space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#22C55E]">
              <AvatarFallback className="bg-emerald-100 text-[#166534] text-xl font-bold">
                {member.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-2xl font-bold text-gray-900">
                {member.display_name}
              </SheetTitle>
              <Badge className="bg-emerald-100 text-[#166534] hover:bg-emerald-100 mt-1">
                {getRoleLabel(member.role)}
              </Badge>
            </div>
          </div>
          <SheetDescription className="text-sm text-gray-500">
            Detalhamento financeiro individual do mês corrente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs text-gray-500 block mb-1">Renda mensal</span>
              <span className="text-lg font-bold text-[#166534]">
                {member.monthly_income ? formatBRL(member.monthly_income) : 'Não cadastrada'}
              </span>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs text-gray-500 block mb-1">Dia de pagamento</span>
              <span className="text-lg font-bold text-blue-700">
                {member.payday ? `Dia ${member.payday}` : 'Não definido'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 block mb-1">E-mail</span>
            <span className="text-sm font-medium text-gray-900">{member.email}</span>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Saldo Líquido Individual</span>
            <span className="text-lg font-bold text-blue-700">{formatBRL(balance)}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
