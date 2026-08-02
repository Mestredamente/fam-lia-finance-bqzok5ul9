import { useState } from 'react'
import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, cn } from '@/lib/utils'
import type { InvoiceItemRecord, CategoryRecord } from '@/types/finance'

const NONE_VALUE = '__none__'

interface Props {
  item: InvoiceItemRecord
  categories: CategoryRecord[]
  selectedCategoryId: string
  onCategoryChange: (itemId: string, categoryId: string) => void
  onConvert: (itemId: string) => Promise<void>
}

export function InvoiceItemRow({
  item,
  categories,
  selectedCategoryId,
  onCategoryChange,
  onConvert,
}: Props) {
  const [converting, setConverting] = useState(false)

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const activeCat = item.expand?.confirmed_category_id || item.expand?.suggested_category_id
  const Icon = getCategoryIcon(activeCat?.icon || 'plus-circle')
  const isConverted = !!item.converted_transaction_id
  const hasCategory = !!selectedCategoryId

  const handleConvert = async () => {
    setConverting(true)
    try {
      await onConvert(item.id)
    } finally {
      setConverting(false)
    }
  }

  const dateStr = item.transaction_date
    ? new Date(item.transaction_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : '—'

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all',
        isConverted
          ? 'bg-emerald-50/50 border-emerald-200'
          : !hasCategory
            ? 'bg-white border-yellow-400 border-2'
            : 'bg-white border-gray-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-gray-900 truncate">{item.description}</p>
            {isConverted && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs gap-0.5">
                <CheckCircle2 className="h-3 w-3" />
                Convertido
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{dateStr}</span>
            {item.suggested_category_id && !hasCategory && !isConverted && (
              <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 text-[10px] gap-0.5 border border-blue-200">
                <Sparkles className="h-2.5 w-2.5" />
                Sugerida
              </Badge>
            )}
          </div>
        </div>
        <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
          {formatBRL(item.amount)}
        </span>
      </div>

      {!isConverted ? (
        <div className="flex items-center gap-2 mt-3">
          <Select
            value={selectedCategoryId || NONE_VALUE}
            onValueChange={(v) => onCategoryChange(item.id, v === NONE_VALUE ? '' : v)}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Sem categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sem categoria</SelectItem>
              {expenseCats.map((c) => {
                const CatIcon = getCategoryIcon(c.icon)
                return (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-1.5">
                      <CatIcon className="h-3 w-3" style={{ color: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {hasCategory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCategoryChange(item.id, '')}
              className="h-8 px-2 text-gray-400 hover:text-gray-600"
              aria-label="Limpar categoria"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleConvert}
            disabled={converting}
            className="bg-[#166534] hover:bg-[#15803D] h-8"
          >
            {converting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Converter'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center mt-3">
          {activeCat ? (
            <Badge
              className="text-xs gap-0.5"
              style={{ backgroundColor: activeCat.color + '20', color: activeCat.color }}
            >
              <Icon className="h-2.5 w-2.5" />
              {activeCat.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-gray-400">
              Sem categoria
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
