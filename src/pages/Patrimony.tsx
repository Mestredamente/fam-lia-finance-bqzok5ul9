import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getActiveMembersByFamilyId } from '@/services/members'
import { InvestmentList } from '@/components/InvestmentList'
import { DebtList } from '@/components/DebtList'
import { cn } from '@/lib/utils'
import type { MemberRecord } from '@/types/finance'

export default function Patrimony() {
  const { family } = useAuth()
  const [activeTab, setActiveTab] = useState<'investments' | 'debts'>('investments')
  const [members, setMembers] = useState<MemberRecord[]>([])

  useEffect(() => {
    if (family)
      getActiveMembersByFamilyId(family.id)
        .then(setMembers)
        .catch(() => {})
  }, [family?.id])

  if (!family) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">Patrimônio</h1>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('investments')}
          className={cn(
            'h-9 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'investments'
              ? 'bg-[#166534] text-white'
              : 'bg-muted hover:bg-muted/80 text-foreground',
          )}
        >
          Investimentos
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={cn(
            'h-9 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'debts'
              ? 'bg-[#166534] text-white'
              : 'bg-muted hover:bg-muted/80 text-foreground',
          )}
        >
          Dívidas
        </button>
      </div>

      {activeTab === 'investments' ? (
        <InvestmentList familyId={family.id} members={members} />
      ) : (
        <DebtList familyId={family.id} members={members} />
      )}
    </div>
  )
}
