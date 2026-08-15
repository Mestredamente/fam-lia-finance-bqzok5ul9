import { useState, useEffect, useCallback } from 'react'
import { Plus, Sparkles, Eye } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import { PeriodSelector } from '@/components/PeriodSelector'
import { type PeriodType } from '@/lib/period-utils'
import { Button } from '@/components/ui/button'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { UnifiedHealthCard } from '@/components/UnifiedHealthCard'
import { OverviewGrid } from '@/components/OverviewGrid'
import { DashboardCards } from '@/components/DashboardCards'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { ScenarioComparator } from '@/components/ScenarioComparator'
import { ExportButton } from '@/components/ExportButton'
import { DashboardInstallBanner } from '@/components/DashboardInstallBanner'
import { MemberRecord } from '@/types/finance'
import { getActiveMembersByFamilyId } from '@/services/members'
import { getMonthName } from '@/lib/utils'
import { BudgetProgressSection } from '@/components/BudgetProgressSection'
import { ComprometimentoFuturoCard } from '@/components/ComprometimentoFuturoCard'
import { UpcomingTasksSection } from '@/components/UpcomingTasksSection'
import { EmotionalSpendingCard } from '@/components/EmotionalSpendingCard'
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
  const [period, setPeriod] = useState<PeriodType>('mes')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const {
    summary,
    transactions: monthTransactions,
    loading,
    error,
    refetch,
    otherMonthsCount,
  } = useMonthlySummary(family?.id, year, month, period)

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
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dados da família...</p>
      </div>
    )
  }

  const now = new Date()
  const isFutureMonth =
    year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())

  const canGoForward = () => {
    const maxFuture = new Date(now.getFullYear() + 2, now.getMonth(), 1)
    const target = new Date(year, month + 1, 1)
    return target <= maxFuture
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
      <DashboardInstallBanner />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">Resumo Financeiro</h1>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            onPrevMonth={() => setCurrentDate(new Date(year, month - 1, 1))}
            onNextMonth={() => canGoForward() && setCurrentDate(new Date(year, month + 1, 1))}
            nextDisabled={!canGoForward()}
            monthLabel={`${getMonthName(month)} ${year}`}
            year={year}
            month={month}
          />
          {isFutureMonth && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-500 text-white">
              Projeção
            </span>
          )}
          {period !== 'tudo' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setPeriod('tudo')}
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver todas
            </Button>
          )}
          <div className="flex items-center gap-2 ml-2">
            <ExportButton transactions={monthTransactions} month={month} year={year} />
            <Button
              variant="outline"
              size="sm"
              className="min-h-[36px] min-w-[36px] px-3 py-2"
              onClick={() => openScenario()}
            >
              <Sparkles className="h-4 w-4" />
              <span className="ml-1 sm:hidden text-xs">Cenários</span>
              <span className="ml-1 hidden sm:inline">Simular Cenários</span>
            </Button>
            <Link to="/orcamentos">
              <Button variant="outline" size="sm">
                Orçamentos
              </Button>
            </Link>
            <Link to="/evolucao">
              <Button variant="outline" size="sm">
                Evolução
              </Button>
            </Link>
          </div>
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
        isFutureMonth={isFutureMonth}
      />

      <ComprometimentoFuturoCard familyId={family.id} />

      {otherMonthsCount > 0 && period !== 'tudo' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700">
            Você tem {otherMonthsCount} {otherMonthsCount === 1 ? 'transação' : 'transações'} em
            outros meses. Use as setas para navegar.
          </p>
        </div>
      )}

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

      <EmotionalSpendingCard familyId={family.id} year={year} month={month} loading={loading} />

      <BudgetProgressSection familyId={family.id} year={year} month={month} />

      <UpcomingTasksSection familyId={family.id} />

      <DashboardCards
        familyId={family.id}
        memberId={member?.id || ''}
        year={year}
        month={month}
        onAddFixed={openFixedForm}
      />

      <button
        data-tour="add-transaction"
        onClick={openForm}
        aria-label="Adicionar transação"
        className="fixed bottom-[5.5rem] right-4 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
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
