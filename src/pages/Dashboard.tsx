import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Wallet, Plus, Users, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { MemberRecord, getRoleLabel } from '@/types/finance'
import { getMembersByFamilyId } from '@/services/members'
import { toast } from '@/hooks/use-toast'
import { formatBRL } from '@/lib/utils'

export default function Dashboard() {
  const { family } = useAuth()

  const [members, setMembers] = useState<MemberRecord[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null)
  const [showMemberSheet, setShowMemberSheet] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const loadMembers = async () => {
    if (!family) return
    try {
      const data = await getMembersByFamilyId(family.id)
      setMembers(data)
    } catch {
      setMembers([])
    }
  }

  useEffect(() => {
    loadMembers()
  }, [family?.id])

  useRealtime('members', () => {
    loadMembers()
  })

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 text-sm">Carregando dados da família...</p>
      </div>
    )
  }

  const inviteCode = family.invite_code

  const totalIncome = 0
  const totalExpenses = 0
  const totalBalance = totalIncome - totalExpenses
  const expenseRatio = 0

  const getProgressBarColor = (ratio: number) => {
    if (ratio <= 50) return 'bg-[#22C55E]'
    if (ratio <= 80) return 'bg-[#EAB308]'
    return 'bg-[#EF4444]'
  }

  const handleMemberClick = (m: MemberRecord) => {
    setSelectedMember(m)
    setShowMemberSheet(true)
  }

  const handleGenerateInvite = () => {
    setShowInviteModal(true)
  }

  return (
    <div className="space-y-8 animate-fade-in">
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

        <p className="text-xs text-gray-400 text-center">Adicione transações para ver seu resumo</p>

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

      {members.length <= 1 && (
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

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Visão por membro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {members.map((m) => {
            const income = m.monthly_income || 0
            const expenses = 0
            const memberRatio = income > 0 ? Math.round((expenses / income) * 100) : 0
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
                        <AvatarFallback className="bg-emerald-100 text-[#166534] font-bold">
                          {m.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{m.display_name}</h3>
                        <span className="text-xs text-gray-500">{getRoleLabel(m.role)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Ver detalhes
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 flex justify-between font-medium">
                    <span>Rec: {formatBRL(income)}</span>
                    <span>Desp: {formatBRL(expenses)}</span>
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

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Contas fixas deste mês</h2>

        <Card className="border border-dashed border-gray-200 shadow-subtle rounded-2xl bg-white">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhuma conta fixa cadastrada</p>
            <Button
              size="sm"
              onClick={() =>
                toast({ title: 'Em breve', description: 'Criação de novas contas fixas em breve.' })
              }
              className="bg-[#166534] hover:bg-[#15803D] text-white"
            >
              Adicionar primeira conta
            </Button>
          </CardContent>
        </Card>
      </section>

      <button
        onClick={() =>
          toast({ title: 'Em breve', description: 'Menu rápido de adição em desenvolvimento.' })
        }
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

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
