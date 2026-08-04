import pb from '@/lib/pocketbase/client'
import type { DebtRecord, CategoryRecord } from '@/types/finance'

export const getDebtsByFamilyId = (familyId: string, memberId?: string) => {
  let filter = `family_id = "${familyId}" && is_active = true`
  if (memberId) filter += ` && owner_id = "${memberId}"`
  return pb.collection('debts').getFullList<DebtRecord>({
    filter,
    sort: '-created',
    expand: 'owner_id',
  })
}

export const getDebtsByOwner = (memberId: string) =>
  pb.collection('debts').getFullList<DebtRecord>({
    filter: `owner_id = "${memberId}" && is_active = true`,
    sort: '-created',
  })

export const createDebt = (data: Partial<DebtRecord>) =>
  pb.collection('debts').create<DebtRecord>(data)

export const updateDebt = (id: string, data: Partial<DebtRecord>) =>
  pb.collection('debts').update<DebtRecord>(id, data)

export const deleteDebt = (id: string) => pb.collection('debts').delete(id)

export const getFixedBillsByFamilyId = (familyId: string) =>
  pb.collection('debts').getFullList<DebtRecord>({
    filter: `family_id = "${familyId}" && is_active = true && (type = "utility" || type = "subscription" || type = "rent" || type = "condo")`,
    sort: 'due_day',
  })

export async function registerDebtPayment(debt: DebtRecord): Promise<{ quitada: boolean }> {
  const categoryName = debt.type === 'credit_card' ? 'Cartão de Crédito' : 'Parcelas'

  let categoryId: string
  try {
    const cat = await pb
      .collection('categories')
      .getFirstListItem<CategoryRecord>(
        `family_id = "${debt.family_id}" && name = "${categoryName}"`,
      )
    categoryId = cat.id
  } catch {
    const cat = await pb.collection('categories').create<CategoryRecord>({
      family_id: debt.family_id,
      name: categoryName,
      type: 'debt',
      icon: 'receipt',
      color: '#DC2626',
      is_fixed: false,
      is_custom: false,
    })
    categoryId = cat.id
  }

  const newPaid = debt.installments_paid + 1
  const newRemaining = debt.installments_total - newPaid
  const newRemainingAmount = Math.max(0, debt.remaining_amount - debt.installment_value)

  await updateDebt(debt.id, {
    installments_paid: newPaid,
    installments_remaining: newRemaining,
    remaining_amount: newRemainingAmount,
    is_active: newRemaining > 0,
  })

  await pb.collection('transactions').create({
    family_id: debt.family_id,
    owner_id: debt.owner_id,
    category_id: categoryId,
    type: 'debt_payment',
    amount: debt.installment_value,
    description: `Parcela ${debt.description}`,
    transaction_date: new Date().toISOString(),
    is_shared: false,
    is_fixed: false,
    source: 'manual',
  })

  return { quitada: newRemaining === 0 }
}
