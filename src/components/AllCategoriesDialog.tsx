import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { usePrivacy } from '@/hooks/use-privacy'
import { formatBRL } from '@/lib/utils'

export interface CategoryItem {
  name: string
  value: number
  color: string
}

interface AllCategoriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CategoryItem[]
}

export function AllCategoriesDialog({ open, onOpenChange, categories }: AllCategoriesDialogProps) {
  const { formatCurrency } = usePrivacy()
  const sortedCategories = [...categories].sort((a, b) => b.value - a.value)
  const total = sortedCategories.reduce((sum, c) => sum + c.value, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-foreground">
            Todas as Despesas por Categoria
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
            Detalhamento de gastos ordenados por maior valor · Total: {formatCurrency(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhuma categoria registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((cat, idx) => {
                const pct = total > 0 ? (cat.value / total) * 100 : 0
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-gray-400 text-[11px] font-medium">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="font-bold text-gray-900 dark:text-foreground">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: cat.color,
                          width: `${Math.min(Math.max(pct, 1), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
