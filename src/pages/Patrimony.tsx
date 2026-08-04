import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getActiveMembersByFamilyId } from '@/services/members'
import { InvestmentList } from '@/components/InvestmentList'
import { DebtList } from '@/components/DebtList'
import { FixedBillsPatrimony } from '@/components/FixedBillsPatrimony'
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
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('investments')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            activeTab === 'investments'
              ? 'bg-[#166534] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          Investimentos
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            activeTab === 'debts'
              ? 'bg-[#166534] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
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

      <FixedBillsPatrimony familyId={family.id} />
    </div>
  )
}
