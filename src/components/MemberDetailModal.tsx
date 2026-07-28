import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FamilyMember } from '@/types/finance'

interface MemberDetailModalProps {
  member: FamilyMember | null
  onClose: () => void
}

export function MemberDetailModal({ member, onClose }: MemberDetailModalProps) {
  if (!member) return null

  const formattedIncome = member.income.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  const formattedExpenses = member.expenses.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  const balance = member.income - member.expenses
  const formattedBalance = balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Dialog open={!!member} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center">
              {member.name[0]}
            </div>
            <div>
              <p className="font-bold text-gray-900">{member.name}</p>
              <p className="text-xs text-gray-500 font-normal">{member.role}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-3 rounded-xl">
            <div>
              <p className="text-xs text-gray-500">Receita</p>
              <p className="text-sm font-semibold text-emerald-700">{formattedIncome}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Despesas</p>
              <p className="text-sm font-semibold text-red-600">{formattedExpenses}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Saldo</p>
              <p className="text-sm font-semibold text-blue-600">{formattedBalance}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-800">
              Principais Categorias de Despesa
            </h4>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Moradia & Utilidades</span>
                <span className="font-medium text-gray-900">R$ 2.650,00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Alimentação</span>
                <span className="font-medium text-gray-900">R$ 1.200,00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Transporte / Outros</span>
                <span className="font-medium text-gray-900">R$ 650,00</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
