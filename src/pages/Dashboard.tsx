import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus,
  Sparkles,
  Eye,
  SlidersHorizontal,
  Check,
  MoreHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type PeriodType, periodLabels } from '@/lib/period-utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MemberDetailSheet } from '@/components/MemberDetailSheet'
import { InviteCodeDialog } from '@/components/InviteCodeDialog'
import { UnifiedHealthCard } from '@/components/UnifiedHealthCard'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { ScenarioComparator } from '@/components/ScenarioComparator'
import { exportToCSV } from '@/lib/export-utils'
import { DashboardInstallBanner } from '@/components/DashboardInstallBanner'
import { MemberRecord, AIInsight } from '@/types/finance'
import { getActiveMembersByFamilyId } from '@/services/members'
import { getMonthName } from '@/lib/utils'
import { ComprometimentoFuturoCard } from '@/components/ComprometimentoFuturoCard'
import { UpcomingTasksSection } from '@/components/UpcomingTasksSection'
import { EmotionalSpendingCard } from '@/components/EmotionalSpendingCard'
import { SavingsGoalsCard } from '@/components/SavingsGoalsCard'
import { ExpensesByCategoryCard } from '@/components/ExpensesByCategoryCard'
import { MonthlyComparisonCard } from '@/components/MonthlyComparisonCard'
import { useMonthComparison } from '@/hooks/use-month-comparison'
import { MemberViewCard } from '@/components/MemberViewCard'
import { PatrimonyCard } from '@/components/PatrimonyCard'
import { SubscriptionsCard } from '@/components/SubscriptionsCard'
import { AiInsightsCard } from '@/components/AiInsightsCard'
import { CustomizableCard } from '@/components/CustomizableCard'
import { BudgetAlertBanner } from '@/components/BudgetAlertBanner'
import { useDashboardLayout, CARD_TITLES, type DashboardCardId } from '@/hooks/use-dashboard-layout'
import { MobileMonthPicker } from '@/components/MobileMonthPicker'
import { FabMenu, ExportBottomSheet, type FabMenuAction } from '@/components/FabMenu'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  PdfCaptureTargets,
  useGeneratePdf,
  type DashboardPdfData,
} from '@/components/DashboardPdfExport'
import { useFutureInstallments } from '@/hooks/use-future-installments'
import { toast } from '@/hooks/use-toast'

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
  const [exporting, setExporting] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showFabMenu, setShowFabMenu] = useState(false)
  const [showExportSheet, setShowExportSheet] = useState(false)
  const isMobile = useIsMobile()

  const { cards, toggleVisible, moveCard, resetLayout } = useDashboardLayout()

  // Off-screen container holding the donut chart + heatmap for PDF capture.
  const pdfCaptureRef = useRef<HTMLDivElement | null>(null)
  const generatePdf = useGeneratePdf(pdfCaptureRef)
  const { installments: futureInstallments } = useFutureInstallments(family?.id)

  // Holds the AI-generated emotional insights surfaced by the
  // EmotionalSpendingCard so they can be included in the PDF export. Using a
  // ref avoids re-rendering the dashboard when insights load.
  const emotionInsightsRef = useRef<AIInsight[]>([])

  // Stable callback so EmotionalSpendingCard's effect doesn't re-fire on every
  // render and overwrite valid insights.
  const handleEmotionInsightsLoaded = useCallback((insights: AIInsight[]) => {
    emotionInsightsRef.current = insights
  }, [])

  // Auto-recover from a corrupted localStorage state: if too few cards are
  // visible on first load, reset to the default layout so the dashboard never
  // appears empty. Runs once on mount.
  useEffect(() => {
    const visibleCount = cards.filter((c) => c.visible).length
    if (visibleCount <= 3) {
      resetLayout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Dados do mês anterior para indicadores de comparação (reutiliza os 12
  // meses já buscados por useMonthlyCharts internamente — sem nova chamada).
  const { prevMonth, hasComparison } = useMonthComparison(family?.id, year, month)

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
              prevReceitas={prevMonth?.income}
              prevDespesas={prevMonth?.expenses}
              prevSaldo={prevMonth?.saldo}
              prevMonthLabel={prevMonth?.label}
              hasComparison={hasComparison}
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
        case 'monthlyComparison':
          return <MonthlyComparisonCard familyId={family.id} year={year} month={month} />
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
        case 'patrimony':
          return <PatrimonyCard familyId={family.id} />
        case 'subscriptions':
          return <SubscriptionsCard familyId={family.id} />
        case 'aiInsights':
          return <AiInsightsCard familyId={family.id} memberId={member?.id || ''} />
        case 'upcomingTasks':
          return <UpcomingTasksSection familyId={family.id} />
        case 'savingsGoals':
          return <SavingsGoalsCard familyId={family.id} />
        case 'emotionalSpending':
          return (
            <EmotionalSpendingCard
              familyId={family.id}
              year={year}
              month={month}
              loading={loading}
              onInsightsLoaded={handleEmotionInsightsLoaded}
            />
          )
        default:
          return null
      }
    },
    [
      family,
      summary,
      loading,
      error,
      refetch,
      year,
      month,
      members,
      member?.id,
      editMode,
      handleEmotionInsightsLoaded,
      prevMonth,
      hasComparison,
    ],
  )

  // Render each card in order, wrapping visible ones in CustomizableCard and
  // skipping hidden ones entirely (unless in edit mode).
  const orderedCards = useMemo(() => {
    const result: React.ReactNode[] = []
    let summaryRendered = false
    cards.forEach((c, idx) => {
      if (!c.visible && !editMode) return
      if (c.id === 'summary') summaryRendered = true
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
    // Defensive fallback: the "summary" (Resumo Financeiro) card must ALWAYS be
    // rendered. If it was missing or hidden in the stored layout, inject it at
    // the top so the dashboard is never without its primary card.
    if (!summaryRendered) {
      const content = renderCard('summary')
      result.unshift(
        <CustomizableCard
          key="summary"
          id="summary"
          visible
          editMode={editMode}
          isFirst
          isLast={cards.length === 0}
          onToggle={() => toggleVisible('summary')}
          onMoveUp={() => moveCard('summary', 'up')}
          onMoveDown={() => moveCard('summary', 'down')}
        >
          {content}
        </CustomizableCard>,
      )
    }
    return result
  }, [cards, editMode, renderCard, toggleVisible, moveCard])

  // Swipe gesture on the mobile header: left → next month, right → previous.
  const touchStartX = React.useRef<number | null>(null)

  // Mobile FAB menu actions, dispatched from the central FAB in BottomNav.
  useEffect(() => {
    const openFab = () => setShowFabMenu(true)
    const openTransactionForm = () => {
      setDefaultIsFixed(false)
      setShowForm(true)
    }
    window.addEventListener('ff-open-fab-menu', openFab)
    window.addEventListener('ff-open-transaction-form', openTransactionForm)
    return () => {
      window.removeEventListener('ff-open-fab-menu', openFab)
      window.removeEventListener('ff-open-transaction-form', openTransactionForm)
    }
  }, [])

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
  const handleExportCSV = () => exportToCSV(monthTransactions, month, year)

  const handleExportFullPdf = async () => {
    if (!family) return
    setExporting(true)
    const data: DashboardPdfData = {
      familyName: family.name,
      month,
      year,
      transactions: monthTransactions,
      members,
      memberSummaries: summary.memberSummaries,
      futureInstallments,
      emotionInsights:
        emotionInsightsRef.current.length > 0 ? emotionInsightsRef.current : undefined,
    }
    try {
      // allow the off-screen capture targets to render before capturing
      await new Promise((r) => setTimeout(r, 150))
      const ok = await generatePdf(data)
      if (!ok) throw new Error('Falha ao gerar PDF')
      toast({ title: 'PDF gerado', description: 'O relatório foi baixado com sucesso.' })
    } catch {
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleFabAction = (a: FabMenuAction) => {
    switch (a.type) {
      case 'transaction':
        setDefaultIsFixed(false)
        setShowForm(true)
        break
      case 'scenario':
        openScenario()
        break
      case 'customize':
        setEditMode((v) => !v)
        break
      case 'export':
        setShowExportSheet(true)
        break
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    const THRESHOLD = 50
    if (delta <= -THRESHOLD && canGoForward()) {
      setCurrentDate(new Date(year, month + 1, 1))
    } else if (delta >= THRESHOLD) {
      setCurrentDate(new Date(year, month - 1, 1))
    }
    touchStartX.current = null
  }

  const memberSummary = selectedMember ? summary.memberSummaries[selectedMember.id] : undefined

  return (
    <div className="space-y-8 animate-fade-in max-w-full overflow-x-hidden">
      <DashboardInstallBanner />
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">
          Resumo Financeiro
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* MOBILE — minimal header: only the current month, centered & tappable.
              Swipe left/right on this area navigates between months. */}
          <div
            className="flex-1 flex items-center justify-center min-w-0 sm:hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              onClick={() => setShowMonthPicker(true)}
              className="flex items-center gap-2 h-9 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors text-sm"
              aria-label="Selecionar mês"
            >
              <span className="text-sm font-semibold capitalize">
                {getMonthName(month)} {year}
              </span>
              {isFutureMonth && (
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-500 text-white shrink-0">
                  Projeção
                </span>
              )}
            </button>
          </div>

          {/* DESKTOP (sm+) — full header with arrows, period select, actions */}
          <div className="hidden sm:flex flex-1 flex items-center gap-1 min-w-0">
            <button
              type="button"
              title="Mês anterior"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="h-9 w-9 p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="h-8 w-auto min-w-[110px] text-sm rounded-lg border-0 bg-muted hover:bg-muted/80 px-3 py-1.5 shadow-none hidden sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(periodLabels) as PeriodType[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {periodLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm font-medium text-foreground capitalize truncate px-1">
              <span className="sm:hidden">{getMonthName(month)}</span>
              <span className="hidden sm:inline">
                {getMonthName(month)} {year}
              </span>
            </span>
            {isFutureMonth && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500 text-white shrink-0">
                Projeção
              </span>
            )}
            <button
              type="button"
              title="Próximo mês"
              onClick={() => canGoForward() && setCurrentDate(new Date(year, month + 1, 1))}
              disabled={!canGoForward()}
              className="h-9 w-9 p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* ZONA DIREITA — Ações centrais + Personalizar + overflow */}
          <div className="flex-1 flex items-center justify-end gap-2">
            {/* Ações centrais alinhadas */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                title="Simular Cenários"
                onClick={() => openScenario()}
                className="inline-flex items-center gap-1.5 h-9 px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Simular Cenários</span>
                <span className="sm:hidden">Cenários</span>
              </button>

              <button
                type="button"
                title="Ver todas"
                onClick={() => setPeriod('tudo')}
                disabled={period === 'tudo'}
                className="inline-flex items-center gap-1.5 h-9 px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Ver todas</span>
              </button>
            </div>
            {/* Personalizar — só ícone */}
            <button
              type="button"
              title={editMode ? 'Concluir personalização' : 'Personalizar'}
              onClick={() => setEditMode((v) => !v)}
              aria-pressed={editMode}
              className="h-9 w-9 p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors shrink-0"
            >
              {editMode ? <Check className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            </button>
            {/* Menu overflow — apenas Exportar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Mais opções"
                  className="h-9 w-9 p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="h-4 w-4" />
                    Exportar
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportFullPdf} disabled={exporting}>
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
            onClick={resetLayout}
          >
            Restaurar padrão
          </Button>
        </div>
      )}

      <BudgetAlertBanner familyId={family.id} year={year} month={month} />

      {orderedCards}

      {/* Standalone FAB — desktop only. On mobile the central FAB in the bottom
          nav opens the expanding FabMenu instead. */}
      <button
        data-tour="add-transaction"
        onClick={openForm}
        aria-label="Adicionar transação"
        className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile-only expanding FAB menu + sheets */}
      <FabMenu
        open={showFabMenu && isMobile}
        onClose={() => setShowFabMenu(false)}
        onAction={handleFabAction}
      />
      <ExportBottomSheet
        open={showExportSheet}
        onClose={() => setShowExportSheet(false)}
        onCSV={handleExportCSV}
        onPDF={handleExportFullPdf}
        exporting={exporting}
      />
      {/* Off-screen capture targets for PDF export (donut chart + heatmap) */}
      <PdfCaptureTargets
        containerRef={pdfCaptureRef}
        data={{
          familyName: family.name,
          month,
          year,
          transactions: monthTransactions,
          members,
          memberSummaries: summary.memberSummaries,
          futureInstallments,
        }}
      />
      <MobileMonthPicker
        open={showMonthPicker}
        onOpenChange={setShowMonthPicker}
        current={currentDate}
        onSelect={(d) => setCurrentDate(d)}
      />

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
