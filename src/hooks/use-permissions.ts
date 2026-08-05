import { useAuth } from '@/hooks/use-auth'
import type { AccessLevel } from '@/types/finance'

export function usePermissions() {
  const { member } = useAuth()

  const accessLevel: AccessLevel = (member?.access_level as AccessLevel) || 'member'
  const isGuardian = accessLevel === 'guardian'
  const isCoAdmin = accessLevel === 'co_admin'

  const has = (perm: boolean | undefined): boolean => isGuardian || (isCoAdmin && !!perm)

  return {
    isGuardian: () => isGuardian,
    isCoAdmin: () => isCoAdmin,
    canViewOthers: () => has(member?.perm_view_others),
    canEditOthers: () => has(member?.perm_edit_others),
    canViewPatrimony: () => has(member?.perm_view_patrimony),
    canViewBudgets: () => has(member?.perm_view_budgets),
    canImportInvoices: () => has(member?.perm_import_invoices),
    canDeleteTransactions: () => has(member?.perm_delete_transactions),
    canDeleteInvoices: () => has(member?.perm_delete_invoices),
    canManageDebts: () => has(member?.perm_manage_debts),
    canManageMembers: () => has(member?.perm_manage_members),
  }
}
