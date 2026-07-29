import pb from '@/lib/pocketbase/client'
import type { TransactionRecord, CategoryRecord } from '@/types/finance'

export async function getSubscriptionsByFamilyId(
  familyId: string,
  monthsBack: number = 7,
): Promise<TransactionRecord[]> {
  let subCategory: CategoryRecord
  try {
    subCategory = await pb
      .collection('categories')
      .getFirstListItem<CategoryRecord>(`family_id = "${familyId}" && name ~ "Assinaturas"`)
  } catch {
    return []
  }

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`

  return pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `family_id = "${familyId}" && category_id = "${subCategory.id}" && transaction_date >= "${startDateStr}"`,
    sort: '-transaction_date',
    expand: 'category_id',
  })
}
