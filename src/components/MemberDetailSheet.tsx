import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FamilyMember } from '@/types/finance'

interface MemberDetailSheetProps {
  member: FamilyMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberDetailSheet({ member, open, onOpenChange }: MemberDetailSheetProps) {
  if (!member) return null

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const balance = member.income - member.expenses

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-6">
        <SheetHeader className="text-left space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#22C55E]">
              <AvatarImage src={member.avatarUrl} alt={member.name} />
              <AvatarFallback className="bg-emerald-100 text-[#166534] text-xl font-bold">
                {member.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-2xl font-bold text-gray-900">{member.name}</SheetTitle>
              <Badge className="bg-emerald-100 text-[#166534] hover:bg-emerald-100 mt-1">
                {member.role}
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
              <span className="text-xs text-gray-500 block mb-1">Receitas</span>
              <span className="text-lg font-bold text-[#166534]">{formatBRL(member.income)}</span>
            </div>

            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <span className="text-xs text-gray-500 block mb-1">Despesas</span>
              <span className="text-lg font-bold text-red-600">{formatBRL(member.expenses)}</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Saldo Líquido Individual</span>
            <span className="text-lg font-bold text-blue-700">{formatBRL(balance)}</span>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-900">Distribuição de Categorias</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Moradia & Contas</span>
                <span className="font-medium">60%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#166534] h-full" style={{ width: '60%' }} />
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>Alimentação & Lazer</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: '25%' }} />
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>Outros</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-400 h-full" style={{ width: '15%' }} />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
