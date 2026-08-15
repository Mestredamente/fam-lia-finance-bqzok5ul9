import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberBreakdown } from '@/components/MemberBreakdown'
import type { MemberRecord } from '@/types/finance'
import type { MemberSummary } from '@/hooks/use-monthly-summary'

interface Props {
  members: MemberRecord[]
  memberSummaries: Record<string, MemberSummary>
  loading: boolean
  onMemberClick: (m: MemberRecord) => void
}

export function MemberViewCard({ members, memberSummaries, loading, onMemberClick }: Props) {
  if (loading) {
    return <Skeleton className="h-64 rounded-2xl" />
  }

  return (
    <Card className="border border-gray-100 shadow-subtle rounded-2xl bg-white">
      <CardContent className="p-5">
        <h3 className="font-bold text-sm text-gray-900 mb-3">Visão por membro</h3>
        <MemberBreakdown
          members={members}
          memberSummaries={memberSummaries}
          loading={loading}
          onMemberClick={onMemberClick}
        />
      </CardContent>
    </Card>
  )
}
