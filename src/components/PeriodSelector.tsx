import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type PeriodType, periodLabels } from '@/lib/period-utils'

interface PeriodSelectorProps {
  period: PeriodType
  onPeriodChange: (period: PeriodType) => void
  onPrevMonth?: () => void
  onNextMonth?: () => void
  monthLabel?: string
}

export function PeriodSelector({
  period,
  onPeriodChange,
  onPrevMonth,
  onNextMonth,
  monthLabel,
}: PeriodSelectorProps) {
  const showArrows = (period === 'mes' || period === 'mes_passado') && onPrevMonth && onNextMonth

  return (
    <div className="flex items-center gap-1.5">
      {showArrows && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
        <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(periodLabels) as PeriodType[]).map((p) => (
            <SelectItem key={p} value={p}>
              {periodLabels[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showArrows && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      {showArrows && monthLabel && (
        <span className="text-xs text-gray-500 ml-1 capitalize">{monthLabel}</span>
      )}
    </div>
  )
}
