import pb from '@/lib/pocketbase/client'
import type { CategoryRecord, CategoryType } from '@/types/finance'

export const getCategoriesByFamilyId = (familyId: string) =>
  pb.collection('categories').getFullList<CategoryRecord>({
    filter: `family_id = "${familyId}"`,
    sort: 'created',
  })

export const createCategory = (data: Partial<CategoryRecord>) =>
  pb.collection('categories').create<CategoryRecord>(data)

export const updateCategory = (id: string, data: Partial<CategoryRecord>) =>
  pb.collection('categories').update<CategoryRecord>(id, data)

export const deleteCategory = (id: string) => pb.collection('categories').delete(id)

interface DefaultCategory {
  name: string
  type: CategoryType
  icon: string
  color: string
  is_fixed?: boolean
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Alimentação', type: 'expense', icon: 'shopping-cart', color: '#10b981' },
  { name: 'Moradia', type: 'expense', icon: 'home', color: '#3b82f6' },
  { name: 'Transporte', type: 'expense', icon: 'car', color: '#f59e0b' },
  { name: 'Saúde', type: 'expense', icon: 'heart', color: '#ef4444' },
  { name: 'Educação', type: 'expense', icon: 'graduation-cap', color: '#8b5cf6' },
  { name: 'Lazer', type: 'expense', icon: 'gamepad-2', color: '#ec4899' },
  { name: 'Vestuário', type: 'expense', icon: 'shirt', color: '#14b8a6' },
  { name: 'Serviços', type: 'expense', icon: 'wrench', color: '#6b7280' },
  { name: 'Tecnologia', type: 'expense', icon: 'smartphone', color: '#6366f1' },
  { name: 'Salário', type: 'income', icon: 'trending-up', color: '#22c55e' },
  { name: 'Investimentos', type: 'investment', icon: 'piggy-bank', color: '#f97316' },
  { name: 'Outros', type: 'expense', icon: 'package', color: '#9ca3af' },
]

export const seedDefaultCategories = async (familyId: string, userId?: string) => {
  const existing = await getCategoriesByFamilyId(familyId)
  if (existing.length > 0) return
  for (const cat of DEFAULT_CATEGORIES) {
    await pb.collection('categories').create({
      family_id: familyId,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      is_fixed: cat.is_fixed ?? false,
      is_custom: false,
      created_by: userId,
    })
  }
}
