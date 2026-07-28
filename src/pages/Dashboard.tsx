import { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Wallet, Plus, Users, Receipt } from 'lucide-react'
import { useMockAuth } from '@/hooks/use-mock-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { FamilyMember } from '@/types/finance'
import { toast } from '@/hooks/use-toast'

export default function Dashboard() {
  const { family, bills, generateInviteCode } = useMockAuth()

  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [showMemberSheet, setShowMemberSheet] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState(family?.inviteCode || 'FAM-1234')

  const totalIncome = family?.members.reduce((acc, m) => acc + m.income, 0) || 12500
  const totalExpenses = family?.members.reduce((acc, m) => acc + m.expenses, 0) || 8230
  const totalBalance = totalIncome - totalExpenses

  const expenseRatio = Math.min(Math.round((totalExpenses / totalIncome) * 1000) / 10, 100)

  const getProgressBarColor = (ratio: number) => {
    if (ratio <= 50) return 'bg-[#22C55E]'
    if (ratio <= 80) return 'bg-[#EAB308]'
    return 'bg-[#EF4444]'
  }

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleMemberClick = (m: FamilyMember) => {
    setSelectedMember(m)
    setShowMemberSheet(true)
  }

  const handleGenerateInvite = async () => {
    const code = await generateInviteCode()
    setInviteCode(code)
    setShowInviteModal(true)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECTION 1 - SUMMARY */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Resumo Financeiro do Mês</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-subtle bg-[#F0FDF4] rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Receitas
                </span>
                <span className="text-2xl font-extrabold text-[#166534]">
                  {formatBRL(totalIncome)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-[#166534]">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-subtle bg-[#FEF2F2] rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Despesas
                </span>
                <span className="text-2xl font-extrabold text-red-600">
                  {formatBRL(totalExpenses)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                <ArrowDownRight className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-subtle bg-[#EFF6FF] rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Saldo do mês
                </span>
                <span className="text-2xl font-extrabold text-blue-700">
                  {formatBRL(totalBalance)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Wallet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-700">
              <span>Comprometimento de Renda</span>
              <span>{expenseRatio}% das receitas</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(expenseRatio)}`}
                style={{ width: `${expenseRatio}%` }}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* SPOUSE BANNER IF 1 MEMBER */}
      {family && family.members.length <= 1 && (
        <section className="p-5 bg-[#F0FDF4] border border-[#22C55E] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-[#166534] shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Convide seu cônjuge</h3>
              <p className="text-xs text-gray-600">
                Seu cônjuge ainda não entrou. Compartilhe as finanças familiares!
              </p>
            </div>
          </div>
          <Button
            onClick={handleGenerateInvite}
            className="bg-[#166534] hover:bg-[#15803D] text-white shrink-0 text-xs font-semibold"
          >
            Gerar código de convite
          </Button>
        </section>
      )}

      {/* SECTION 2 - MEMBERS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Visão por membro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {family?.members.map((m) => {
            const memberRatio = Math.round((m.expenses / m.income) * 100)
            return (
              <Card
                key={m.id}
                onClick={() => handleMemberClick(m)}
                className="border border-gray-100 shadow-subtle hover:shadow-elevation rounded-2xl bg-white cursor-pointer transition-all duration-200"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-[#22C55E]">
                        <AvatarImage src={m.avatarUrl} alt={m.name} />
                        <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                          {m.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{m.name}</h3>
                        <span className="text-xs text-gray-500">{m.role}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Ver detalhes
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 flex justify-between font-medium">
                    <span>Rec: {formatBRL(m.income)}</span>
                    <span>Desp: {formatBRL(m.expenses)}</span>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(memberRatio)}`}
                      style={{ width: `${memberRatio}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* SECTION 3 - FIXED BILLS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Contas fixas deste mês</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast({ title: 'Em breve', description: 'Criação de novas contas fixas em breve.' })
            }
          >
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {bills.map((bill) => {
            const badgeColors = {
              Pago: 'bg-emerald-100 text-[#166534] border-emerald-200',
              Pendente: 'bg-amber-100 text-amber-800 border-amber-200',
              Atrasado: 'bg-red-100 text-red-700 border-red-200',
            }

            return (
              <Card
                key={bill.id}
                className="border border-gray-100 shadow-subtle rounded-xl bg-white"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">{bill.name}</h4>
                      <span className="text-xs text-gray-500">Vence dia {bill.dueDateDay}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-sm text-gray-900">
                      {formatBRL(bill.amount)}
                    </span>
                    <Badge className={`text-xs font-semibold ${badgeColors[bill.status]}`}>
                      {bill.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* FAB BUTTON */}
      <button
        onClick={() =>
          toast({ title: 'Em breve', description: 'Menu rápido de adição em desenvolvimento.' })
        }
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* MODALS */}
      <MemberDetailSheet
        member={selectedMember}
        open={showMemberSheet}
        onOpenChange={setShowMemberSheet}
      />
      <InviteCodeDialog
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        code={inviteCode}
      />
    </div>
  )
}
