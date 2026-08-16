import { useMemo } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { getMonthName } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  current: Date
  onSelect: (d: Date) => void
}

/**
 * Bottom-sheet month picker for mobile. Lists the last 12 months and the
 * next 24 months relative to today, so the user can quickly jump to any
 * relevant period.
 */
export function MobileMonthPicker({ open, onOpenChange, current, onSelect }: Props) {
  const months = useMemo(() => {
    const now = new Date()
    const list: { year: number; month: number; label: string; isCurrent: boolean }[] = []
    // 12 past months
    for (let i = 12; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${getMonthName(d.getMonth())} ${d.getFullYear()}`,
        isCurrent: false,
      })
    }
    // current
    list.push({
      year: now.getFullYear(),
      month: now.getMonth(),
      label: `${getMonthName(now.getMonth())} ${now.getFullYear()}`,
      isCurrent: true,
    })
    // next 24 months
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${getMonthName(d.getMonth())} ${d.getFullYear()}`,
        isCurrent: false,
      })
    }
    return list
  }, [])

  const isSelected = (y: number, m: number) =>
    current.getFullYear() === y && current.getMonth() === m

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-base">Selecionar mês</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto grid grid-cols-1 gap-1">
          {months.map((m) => {
            const selected = isSelected(m.year, m.month)
            return (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => {
                  onSelect(new Date(m.year, m.month, 1))
                  onOpenChange(false)
                }}
                className={cn(
                  'flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm transition-colors text-left',
                  selected
                    ? 'bg-[#166534] text-white font-semibold'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                <span>{m.label}</span>
                {m.isCurrent && !selected && (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
                    atual
                  </span>
                )}
                {selected && <Check className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
