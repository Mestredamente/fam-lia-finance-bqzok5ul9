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
  { name: 'Moradia', type: 'expense', icon: 'home', color: '#EF4444', is_fixed: true },
  { name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#F59E0B' },
  { name: 'Transporte', type: 'expense', icon: 'car', color: '#3B82F6' },
  { name: 'Saúde', type: 'expense', icon: 'heart', color: '#EC4899' },
  { name: 'Lazer', type: 'expense', icon: 'gamepad', color: '#8B5CF6' },
  { name: 'Educação', type: 'expense', icon: 'book', color: '#14B8A6' },
  { name: 'Cartão de Crédito', type: 'expense', icon: 'credit-card', color: '#6366F1' },
  { name: 'Assinaturas', type: 'expense', icon: 'refresh-cw', color: '#A855F7', is_fixed: true },
  { name: 'Mercado', type: 'expense', icon: 'shopping-cart', color: '#F97316' },
  { name: 'Restaurantes', type: 'expense', icon: 'coffee', color: '#EAB308' },
  { name: 'Salário', type: 'income', icon: 'banknote', color: '#22C55E' },
  { name: 'Outros ganhos', type: 'income', icon: 'plus-circle', color: '#10B981' },
  { name: 'Parcelas', type: 'debt', icon: 'receipt', color: '#DC2626' },
]

export const seedDefaultCategories = async (familyId: string) => {
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
    })
  }
}
