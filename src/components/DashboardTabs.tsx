import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FixedBillsSection } from '@/components/FixedBillsSection'
import { PatrimonyDashboardCard } from '@/components/PatrimonyDashboardCard'
import { SubscriptionAlert } from '@/components/SubscriptionAlert'
import { InsightsSection } from '@/components/InsightsSection'
import { useFixedBills } from '@/hooks/use-fixed-bills'

interface Props {
  familyId: string
  memberId: string
  year: number
  month: number
  onAddFixed: () => void
  onSeeSubscriptions: () => void
}

export function DashboardTabs({
  familyId,
  memberId,
  year,
  month,
  onAddFixed,
  onSeeSubscriptions,
}: Props) {
  const { fixedBills, totalPaid, loading: billsLoading } = useFixedBills(familyId, year, month)

  return (
    <Tabs defaultValue="fixed-bills" className="w-full">
      <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
        <TabsTrigger value="fixed-bills" className="text-xs">
          Contas Fixas
        </TabsTrigger>
        <TabsTrigger value="assets" className="text-xs">
          Patrimônio
        </TabsTrigger>
        <TabsTrigger value="subscriptions" className="text-xs">
          Assinaturas
        </TabsTrigger>
        <TabsTrigger value="insights" className="text-xs">
          Insights
        </TabsTrigger>
      </TabsList>
      <div className="border-t border-gray-100 mt-2" />
      <TabsContent value="fixed-bills" className="mt-6 sm:mt-8">
        <FixedBillsSection
          fixedBills={fixedBills}
          totalPaid={totalPaid}
          loading={billsLoading}
          onAddFixed={onAddFixed}
        />
      </TabsContent>
      <TabsContent value="assets" className="mt-6 sm:mt-8">
        <PatrimonyDashboardCard familyId={familyId} />
      </TabsContent>
      <TabsContent value="subscriptions" className="mt-6 sm:mt-8">
        <SubscriptionAlert familyId={familyId} onSeeDetails={onSeeSubscriptions} />
      </TabsContent>
      <TabsContent value="insights" className="mt-6 sm:mt-8">
        <InsightsSection familyId={familyId} memberId={memberId} />
      </TabsContent>
    </Tabs>
  )
}
