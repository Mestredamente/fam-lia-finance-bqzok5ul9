import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Sparkles, Palette } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import { Button } from '@/components/ui/button'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { UnifiedHealthCard } from '@/components/UnifiedHealthCard'
import { OverviewGrid } from '@/components/OverviewGrid'
import { DashboardTabs } from '@/components/DashboardTabs'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { ScenarioComparator } from '@/components/ScenarioComparator'
import { ExportButton } from '@/components/ExportButton'
import { MemberRecord } from '@/types/finance'
import { getActiveMembersByFamilyId } from '@/services/members'
import { getMonthName } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { BudgetProgressSection } from '@/components/BudgetProgressSection'
import { useColorPersonalization } from '@/hooks/use-color-personalization'
import { Link } from 'react-router-dom'

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

  const {
    summary,
    transactions: monthTransactions,
    loading,
    error,
    refetch,
  } = useMonthlySummary(family?.id, year, month)

  const {
    enabled: colorEnabled,
    toggle: toggleColor,
    primaryColor,
  } = useColorPersonalization(family?.id)

  const loadMembers = useCallback(async () => {
    if (!family) return
    try {
      const data = await getActiveMembersByFamilyId(family.id)
      setMembers(data)
    } catch {
      setMembers([])
    }
  }, [family?.id])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useRealtime('members', () => {
    loadMembers()
  })
  useRealtime('transactions', () => {
    refetch()
  })
  useRealtime('categories', () => {
    refetch()
  })

  useEffect(() => {
    const interval = setInterval(() => {
      loadMembers()
    }, 10000)
    return () => clearInterval(interval)
  }, [loadMembers])

  useEffect(() => {
    const handleFocus = () => loadMembers()
    const handleVisibilityChange = () => {
      if (!document.hidden) loadMembers()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadMembers])

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
          <ExportButton transactions={monthTransactions} month={month} year={year} />
          <Button variant="outline" size="sm" onClick={() => openScenario()}>
            <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline ml-1">E se...?</span>
          </Button>
          <div className="flex items-center gap-1.5 px-2">
            <Palette className="h-4 w-4 text-gray-400" />
            <Switch checked={colorEnabled} onCheckedChange={toggleColor} />
          </div>
          <Link to="/orcamentos">
            <Button variant="outline" size="sm">
              <span className="hidden sm:inline">Orçamentos</span>
            </Button>
          </Link>
          <Link to="/evolucao">
            <Button variant="outline" size="sm">
              <span className="hidden sm:inline">Evolução</span>
            </Button>
          </Link>
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

      <UnifiedHealthCard
        familyId={family.id}
        totalReceitas={summary.totalReceitas}
        totalDespesas={summary.totalDespesas}
        saldo={summary.saldo}
        porcentagemGasta={summary.porcentagemGasta}
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      <OverviewGrid
        familyId={family.id}
        year={year}
        month={month}
        members={members}
        memberSummaries={summary.memberSummaries}
        loading={loading}
        onMemberClick={handleMemberClick}
        onInvite={() => setShowInviteModal(true)}
      />

      <BudgetProgressSection
        familyId={family.id}
        year={year}
        month={month}
        primaryColor={primaryColor}
      />

      <DashboardTabs
        familyId={family.id}
        memberId={member?.id || ''}
        year={year}
        month={month}
        onAddFixed={openFixedForm}
        onSeeSubscriptions={() => openScenario('cut-subscriptions')}
      />

      <button
        data-tour="add-transaction"
        onClick={openForm}
        aria-label="Adicionar transação"
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
