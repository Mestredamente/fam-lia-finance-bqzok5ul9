import { memo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Sparkles, X, Trash2, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getCategoryIcon } from '@/lib/category-icons'
import { formatBRL, cn } from '@/lib/utils'
import type { InvoiceItemRecord, CategoryRecord, TransactionEmotion } from '@/types/finance'

const NONE_VALUE = '__none__'

const EMOTION_OPTIONS: { value: TransactionEmotion; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: 'Feliz' },
  { value: 'necessary', emoji: '✅', label: 'Necessário' },
  { value: 'neutral', emoji: '😐', label: 'Neutro' },
  { value: 'regret', emoji: '😬', label: 'Arrependido' },
  { value: 'impulsive', emoji: '😤', label: 'Impulsivo' },
]

const EMOTION_EMOJI: Record<TransactionEmotion, string> = {
  happy: '😊',
  necessary: '✅',
  neutral: '😐',
  regret: '😬',
  impulsive: '😤',
  grateful: '🙏',
  surprised: '🎉',
  anxious: '😰',
}

interface Props {
  item: InvoiceItemRecord
  categories: CategoryRecord[]
  selectedCategoryId: string
  selectedEmotion?: TransactionEmotion | null
  onCategoryChange: (itemId: string, categoryId: string) => void
  onEmotionChange?: (itemId: string, emotion: TransactionEmotion | null) => void
  onConvert: (itemId: string) => Promise<void>
  onDelete: (itemId: string) => void
  isFailed?: boolean
}

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.selectedCategoryId !== next.selectedCategoryId) return false
  if (prev.selectedEmotion !== next.selectedEmotion) return false
  if (prev.isFailed !== next.isFailed) return false
  if (prev.categories !== next.categories) return false
  if (prev.onCategoryChange !== next.onCategoryChange) return false
  if (prev.onEmotionChange !== next.onEmotionChange) return false
  if (prev.onConvert !== next.onConvert) return false
  if (prev.onDelete !== next.onDelete) return false
  if (prev.item.id !== next.item.id) return false
  if (prev.item.description !== next.item.description) return false
  if (prev.item.amount !== next.item.amount) return false
  if (prev.item.transaction_date !== next.item.transaction_date) return false
  if (prev.item.converted_transaction_id !== next.item.converted_transaction_id) return false
  if (prev.item.is_confirmed !== next.item.is_confirmed) return false
  if (prev.item.suggested_category_id !== next.item.suggested_category_id) return false
  if (prev.item.confirmed_category_id !== next.item.confirmed_category_id) return false
  return true
}

function InvoiceItemRowComponent({
  item,
  categories,
  selectedCategoryId,
  selectedEmotion,
  onCategoryChange,
  onEmotionChange,
  onConvert,
  onDelete,
  isFailed,
}: Props) {
  const [converting, setConverting] = useState(false)
  const [emotionOpen, setEmotionOpen] = useState(false)

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
        isFailed
          ? 'bg-red-50 border-red-400 border-2'
          : isConverted
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
            {isFailed && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs gap-0.5 border border-red-300">
                <AlertCircle className="h-3 w-3" />
                Erro na conversão
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
        <div className="flex items-center gap-1">
          {onEmotionChange && (
            <Popover open={emotionOpen} onOpenChange={setEmotionOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  aria-label="Marcar emoção"
                >
                  {selectedEmotion ? (
                    <span className="text-base leading-none" aria-hidden="true">
                      {EMOTION_EMOJI[selectedEmotion]}
                    </span>
                  ) : (
                    <Smile className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="grid grid-cols-5 gap-1" role="group" aria-label="Selecionar emoção">
                  {EMOTION_OPTIONS.map((e) => {
                    const selected = selectedEmotion === e.value
                    return (
                      <button
                        key={e.value}
                        type="button"
                        aria-label={e.label}
                        aria-pressed={selected}
                        onClick={() => {
                          onEmotionChange(item.id, selected ? null : e.value)
                          setEmotionOpen(false)
                        }}
                        className={cn(
                          'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all',
                          selected
                            ? 'border-[#166534] bg-emerald-50'
                            : 'border-transparent hover:border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <span className="text-lg leading-none" aria-hidden="true">
                          {e.emoji}
                        </span>
                        <span className="text-[9px] text-gray-500 leading-tight">{e.label}</span>
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
            aria-label="Excluir item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
            {formatBRL(item.amount)}
          </span>
        </div>
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

export const InvoiceItemRow = memo(InvoiceItemRowComponent, arePropsEqual)
