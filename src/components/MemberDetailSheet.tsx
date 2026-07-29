import { useNavigate } from 'react-router-dom'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemberRecord, getRoleLabel } from '@/types/finance'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, formatDatePtBR, cn } from '@/lib/utils'
import type { MemberSummary } from '@/hooks/use-monthly-summary'

interface MemberDetailSheetProps {
  member: MemberRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  summary?: MemberSummary
  isOwner: boolean
}

export function MemberDetailSheet({
  member,
  open,
  onOpenChange,
  summary,
  isOwner,
}: MemberDetailSheetProps) {
  const navigate = useNavigate()

  if (!member) return null

  const data = summary || {
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    transactionCount: 0,
    transactions: [],
  }

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
          <SheetDescription className="text-sm text-gray-500">{member.email}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-gray-500 block">Renda mensal</span>
              <span className="text-sm font-bold text-[#166534]">
                {member.monthly_income ? formatBRL(member.monthly_income) : 'Não cadastrada'}
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] text-gray-500 block">Dia de pagamento</span>
              <span className="text-sm font-bold text-blue-700">
                {member.payday ? `Dia ${member.payday}` : 'Não definido'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <span className="text-[10px] text-gray-500 block">Receitas</span>
              <span className="text-sm font-bold text-[#166534]">
                {formatBRL(data.totalReceitas)}
              </span>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
              <span className="text-[10px] text-gray-500 block">Despesas</span>
              <span className="text-sm font-bold text-red-600">
                {formatBRL(data.totalDespesas)}
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
              <span className="text-[10px] text-gray-500 block">Saldo</span>
              <span className="text-sm font-bold text-blue-700">{formatBRL(data.saldo)}</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
            <span className="text-xs font-medium text-gray-600">Transações no mês</span>
            <span className="text-sm font-bold text-gray-900">{data.transactionCount}</span>
          </div>

          {data.transactions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recentes</h4>
              {data.transactions.map((t) => {
                const cat = t.expand?.category_id
                const Icon = getCategoryIcon(cat?.icon || 'plus-circle')
                const color =
                  t.type === 'income'
                    ? 'text-[#22C55E]'
                    : t.type === 'investment'
                      ? 'text-blue-600'
                      : 'text-red-600'
                const prefix = t.type === 'income' ? '+ ' : '- '
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (cat?.color || '#999') + '20' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: cat?.color || '#999' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{t.description}</p>
                      <p className="text-[10px] text-gray-500">
                        {formatDatePtBR(t.transaction_date)}
                      </p>
                    </div>
                    <span className={cn('text-xs font-bold whitespace-nowrap', color)}>
                      {prefix}
                      {formatBRL(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {isOwner && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false)
                navigate('/transacoes')
              }}
            >
              Ver todas as minhas transações
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
