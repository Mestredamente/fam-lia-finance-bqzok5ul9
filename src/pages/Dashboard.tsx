import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Sparkles, Eye, SlidersHorizontal, Check } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import { PeriodSelector } from '@/components/PeriodSelector'
import { type PeriodType } from '@/lib/period-utils'
import { Button } from '@/components/ui/button'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { UnifiedHealthCard } from '@/components/UnifiedHealthCard'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { ScenarioComparator } from '@/components/ScenarioComparator'
import { ExportButton } from '@/components/ExportButton'
import { DashboardInstallBanner } from '@/components/DashboardInstallBanner'
import { MemberRecord } from '@/types/finance'
import { getActiveMembersByFamilyId } from '@/services/members'
import { getMonthName } from '@/lib/utils'
import { ComprometimentoFuturoCard } from '@/components/ComprometimentoFuturoCard'
import { UpcomingTasksSection } from '@/components/UpcomingTasksSection'
import { EmotionalSpendingCard } from '@/components/EmotionalSpendingCard'
import { ExpensesByCategoryCard } from '@/components/ExpensesByCategoryCard'
import { MemberViewCard } from '@/components/MemberViewCard'
import { FixedBillsCard } from '@/components/FixedBillsCard'
import { PatrimonyCard } from '@/components/PatrimonyCard'
import { SubscriptionsCard } from '@/components/SubscriptionsCard'
import { AiInsightsCard } from '@/components/AiInsightsCard'
import { CustomizableCard } from '@/components/CustomizableCard'
import { useDashboardLayout, CARD_TITLES, type DashboardCardId } from '@/hooks/use-dashboard-layout'
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
  const [editMode, setEditMode] = useState(false)

  const { cards, toggleVisible, moveCard } = useDashboardLayout()

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

  // Render the content for each customizable dashboard card.
  const renderCard = useCallback(
    (id: DashboardCardId) => {
      if (!family) return null
      switch (id) {
        case 'summary':
          return (
            <UnifiedHealthCard
              familyId={family.id}
              totalReceitas={summary.totalReceitas}
              totalDespesas={summary.totalDespesas}
              saldo={summary.saldo}
              porcentagemGasta={summary.porcentagemGasta}
              loading={loading}
              error={error}
              onRetry={refetch}
              isFutureMonth={
                year > new Date().getFullYear() ||
                (year === new Date().getFullYear() && month > new Date().getMonth())
              }
            />
          )
        case 'expensesByCategory':
          return (
            <ExpensesByCategoryCard
              familyId={family.id}
              year={year}
              month={month}
              loading={loading}
            />
          )
        case 'memberView':
          return (
            <MemberViewCard
              members={members}
              memberSummaries={summary.memberSummaries}
              loading={loading}
              onMemberClick={(m) => {
                setSelectedMember(m)
                setShowMemberSheet(true)
              }}
            />
          )
        case 'futureCommitment':
          return <ComprometimentoFuturoCard familyId={family.id} forceRender={editMode} />
        case 'fixedBills':
          return (
            <FixedBillsCard
              familyId={family.id}
              year={year}
              month={month}
              onAddFixed={() => {
                setDefaultIsFixed(true)
                setShowForm(true)
              }}
            />
          )
        case 'patrimony':
          return <PatrimonyCard familyId={family.id} />
        case 'subscriptions':
          return <SubscriptionsCard familyId={family.id} />
        case 'aiInsights':
          return <AiInsightsCard familyId={family.id} memberId={member?.id || ''} />
        case 'upcomingTasks':
          return <UpcomingTasksSection familyId={family.id} />
        case 'emotionalSpending':
          return (
            <EmotionalSpendingCard
              familyId={family.id}
              year={year}
              month={month}
              loading={loading}
            />
          )
        default:
          return null
      }
    },
    [family, summary, loading, error, refetch, year, month, members, member?.id, editMode],
  )

  // Render each card in order, wrapping visible ones in CustomizableCard and
  // skipping hidden ones entirely (unless in edit mode).
  const orderedCards = useMemo(() => {
    const result: React.ReactNode[] = []
    cards.forEach((c, idx) => {
      if (!c.visible && !editMode) return
      const content = renderCard(c.id)
      // The two-column row layout is used only for expensesByCategory +
      // memberView. Everything else is full-width.
      result.push(
        <CustomizableCard
          key={c.id}
          id={c.id}
          visible={c.visible}
          editMode={editMode}
          isFirst={idx === 0}
          isLast={idx === cards.length - 1}
          onToggle={() => toggleVisible(c.id)}
          onMoveUp={() => moveCard(c.id, 'up')}
          onMoveDown={() => moveCard(c.id, 'down')}
        >
          {content}
        </CustomizableCard>,
      )
    })
    return result
  }, [cards, editMode, renderCard, toggleVisible, moveCard])

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
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              className="min-h-[36px] px-3 py-2"
              onClick={() => setEditMode((v) => !v)}
              aria-pressed={editMode}
            >
              {editMode ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="ml-1">Concluir</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Personalizar</span>
                </>
              )}
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

      {editMode && (
        <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-xs text-indigo-700">
            Modo de personalização ativo. Use os botões no canto superior direito de cada card para
            mostrar/ocultar (olho) e reordenar (setas ↑↓). O card <strong>Resumo Financeiro</strong>{' '}
            é fixo e não pode ser ocultado. Suas alterações são salvas automaticamente.
          </p>
        </div>
      )}

      {orderedCards}

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
