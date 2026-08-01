import { useState } from 'react'
import { Check, CheckCircle2, Loader2 } from 'lucide-react'
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

interface Props {
  item: InvoiceItemRecord
  categories: CategoryRecord[]
  onConfirm: (itemId: string, categoryId: string) => Promise<void>
  onConvert: (itemId: string) => Promise<void>
}

export function InvoiceItemRow({ item, categories, onConfirm, onConvert }: Props) {
  const [selectedCat, setSelectedCat] = useState(
    item.confirmed_category_id || item.suggested_category_id || '',
  )
  const [confirming, setConfirming] = useState(false)
  const [converting, setConverting] = useState(false)

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const activeCat = item.expand?.confirmed_category_id || item.expand?.suggested_category_id
  const Icon = getCategoryIcon(activeCat?.icon || 'plus-circle')
  const isConverted = !!item.converted_transaction_id

  const handleConfirm = async () => {
    if (!selectedCat) return
    setConfirming(true)
    try {
      await onConfirm(item.id, selectedCat)
    } finally {
      setConfirming(false)
    }
  }

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
        item.is_confirmed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-200',
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
            {activeCat && !item.is_confirmed && (
              <Badge
                variant="outline"
                className="text-xs gap-0.5"
                style={{ borderColor: activeCat.color + '40', color: activeCat.color }}
              >
                <Icon className="h-2.5 w-2.5" />
                {activeCat.name}
              </Badge>
            )}
          </div>
        </div>
        <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
          {formatBRL(item.amount)}
        </span>
      </div>

      {!item.is_confirmed ? (
        <div className="flex items-center gap-2 mt-3">
          <Select value={selectedCat} onValueChange={setSelectedCat}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Selecionar categoria" />
            </SelectTrigger>
            <SelectContent>
              {expenseCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={confirming || !selectedCat}
            className="bg-[#166534] hover:bg-[#15803D] h-8"
          >
            {confirming ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                Confirmar
              </>
            )}
          </Button>
        </div>
      ) : !isConverted ? (
        <div className="flex items-center justify-between mt-3 gap-2">
          {activeCat && (
            <Badge
              className="text-xs gap-0.5"
              style={{ backgroundColor: activeCat.color + '20', color: activeCat.color }}
            >
              <Icon className="h-2.5 w-2.5" />
              {activeCat.name}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvert}
            disabled={converting}
            className="h-8 text-xs"
          >
            {converting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Converter em transação
          </Button>
        </div>
      ) : (
        <div className="flex items-center mt-3">
          {activeCat && (
            <Badge
              className="text-xs gap-0.5"
              style={{ backgroundColor: activeCat.color + '20', color: activeCat.color }}
            >
              <Icon className="h-2.5 w-2.5" />
              {activeCat.name}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
