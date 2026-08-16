import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/CurrencyInput'
import { useCategories } from '@/hooks/use-categories'
import { createBudget, updateBudget } from '@/services/budgets'
import { getCategoryIcon } from '@/lib/category-icons'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import type { BudgetRecord } from '@/types/budgets'
import type { MemberRecord } from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  editingBudget?: BudgetRecord | null
  members: MemberRecord[]
  onSaved?: () => void
}

export function BudgetFormSheet({
  open,
  onOpenChange,
  familyId,
  editingBudget,
  members,
  onSaved,
}: Props) {
  const { categories } = useCategories(familyId)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [limit, setLimit] = useState(0)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  useEffect(() => {
    if (open) {
      if (editingBudget) {
        setCategoryId(editingBudget.category_id)
        setLimit(editingBudget.monthly_limit)
        setMemberId(editingBudget.member_id || null)
      } else {
        setCategoryId(null)
        setLimit(0)
        setMemberId(null)
      }
    }
  }, [open, editingBudget])

  const handleSave = async () => {
    if (!categoryId || limit <= 0) return
    setSaving(true)
    try {
      const data = {
        family_id: familyId,
        category_id: categoryId,
        member_id: memberId || null,
        monthly_limit: limit,
        is_active: true,
      }
      if (editingBudget) {
        await updateBudget(editingBudget.id, data)
        toast({ title: 'Orçamento atualizado' })
      } else {
        await createBudget(data)
        toast({ title: 'Orçamento criado' })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Categoria
            </Label>
            <div className="mt-1 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {expenseCategories.map((cat) => {
                const Icon = getCategoryIcon(cat.icon || 'wallet')
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-xl border-2 text-xs font-medium transition-all',
                      categoryId === cat.id
                        ? 'border-[#166534] bg-emerald-50 dark:bg-emerald-950/40'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-card text-gray-600 dark:text-gray-300',
                    )}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (cat.color || '#999') + '20' }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: cat.color || '#999' }} />
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Limite mensal (R$)
            </Label>
            <div className="mt-1">
              <CurrencyInput value={limit} onChange={setLimit} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Membro (opcional)
            </Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMemberId(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all',
                  !memberId
                    ? 'border-[#166534] bg-emerald-50 dark:bg-emerald-950/40 text-[#166534] dark:text-emerald-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300',
                )}
              >
                Todos
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberId(m.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all',
                    memberId === m.id
                      ? 'border-[#166534] bg-emerald-50 dark:bg-emerald-950/40 text-[#166534] dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300',
                  )}
                >
                  {m.display_name}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !categoryId || limit <= 0}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
