import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Users, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import { useFixedBills } from '@/hooks/use-fixed-bills'
import { Button } from '@/components/ui/button'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { DashboardSummary } from '@/components/DashboardSummary'
import { MemberBreakdown } from '@/components/MemberBreakdown'
import { FixedBillsSection } from '@/components/FixedBillsSection'
import { PatrimonyDashboardCard } from '@/components/PatrimonyDashboardCard'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { FinancialHealthScore } from '@/components/FinancialHealthScore'
import { InsightsSection } from '@/components/InsightsSection'
import { SubscriptionAlert } from '@/components/SubscriptionAlert'
import { ScenarioComparator } from '@/components/ScenarioComparator'
import { MemberRecord } from '@/types/finance'
import { getMembersByFamilyId } from '@/services/members'
import { getMonthName } from '@/lib/utils'

export default function Dashboard() {
  const { family, member } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null)
  const [showMemberSheet, setShowMemberSheet] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [defaultIsFixed, setDefaultIsFixed] = useState(false)
  const [showScenarioModal, setShowScenarioModal] = useState(false)
  const [scenarioTab, setScenarioTab] = useState<string | undefined>(undefined)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { summary, loading, error, refetch } = useMonthlySummary(family?.id, year, month)
  const { fixedBills, totalPaid, loading: billsLoading } = useFixedBills(family?.id, year, month)

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

  const canGoForward = () => {
    const now = new Date()
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())
  }

  const handleMemberClick = (m: MemberRecord) => {
    setSelectedMember(m)
    setShowMemberSheet(true)
  }
  const openForm = () => {
    setDefaultIsFixed(false)
    setShowForm(true)
  }
  const openFixedForm = () => {
    setDefaultIsFixed(true)
    setShowForm(true)
  }
  const openScenario = (scenario?: string) => {
    setScenarioTab(scenario)
    setShowScenarioModal(true)
  }

  const memberSummary = selectedMember ? summary.memberSummaries[selectedMember.id] : undefined

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Resumo Financeiro</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openScenario()}>
            <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline ml-1">E se...?</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
            {getMonthName(month)} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => canGoForward() && setCurrentDate(new Date(year, month + 1, 1))}
            disabled={!canGoForward()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <FinancialHealthScore familyId={family.id} />

      <InsightsSection familyId={family.id} memberId={member?.id || ''} />

      <DashboardSummary
        totalReceitas={summary.totalReceitas}
        totalDespesas={summary.totalDespesas}
        saldo={summary.saldo}
        porcentagemGasta={summary.porcentagemGasta}
        loading={loading}
        error={error}
        onRetry={refetch}
      />

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
            onClick={() => setShowInviteModal(true)}
            className="bg-[#166534] hover:bg-[#15803D] text-white shrink-0 text-xs font-semibold"
          >
            Gerar código de convite
          </Button>
        </section>
      )}

      <MemberBreakdown
        members={members}
        memberSummaries={summary.memberSummaries}
        loading={loading}
        onMemberClick={handleMemberClick}
      />

      <PatrimonyDashboardCard familyId={family.id} />

      <SubscriptionAlert
        familyId={family.id}
        onSeeDetails={() => openScenario('cut-subscriptions')}
      />

      <FixedBillsSection
        fixedBills={fixedBills}
        totalPaid={totalPaid}
        loading={billsLoading}
        onAddFixed={openFixedForm}
      />

      <button
        onClick={openForm}
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      <MemberDetailSheet
        member={selectedMember}
        open={showMemberSheet}
        onOpenChange={setShowMemberSheet}
        summary={memberSummary}
        isOwner={selectedMember?.id === member?.id}
      />
      <InviteCodeDialog
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        code={family.invite_code}
      />
      <TransactionFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family.id}
        ownerId={member?.id || ''}
        onSaved={refetch}
        defaultIsFixed={defaultIsFixed}
      />
      <ScenarioComparator
        open={showScenarioModal}
        onOpenChange={setShowScenarioModal}
        familyId={family.id}
        initialScenario={scenarioTab}
      />
    </div>
  )
}
