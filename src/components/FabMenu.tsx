import { useEffect, useState } from 'react'
import { Plus, Sparkles, SlidersHorizontal, Download, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { FileSpreadsheet, FileText } from 'lucide-react'

export interface FabMenuAction {
  type: 'transaction' | 'scenario' | 'customize' | 'export'
}

interface Props {
  open: boolean
  onClose: () => void
  onAction: (a: FabMenuAction) => void
}

interface ExportSheetProps {
  open: boolean
  onClose: () => void
  onCSV: () => void
  onPDF: () => void
  exporting: boolean
}

/**
 * Bottom sheet for the "Exportar" option — slides up from the bottom
 * with a dark overlay (provided by the Drawer primitive).
 */
export function ExportBottomSheet({ open, onClose, onCSV, onPDF, exporting }: ExportSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[50vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-base">Exportar</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          <button
            onClick={() => {
              onCSV()
              onClose()
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-muted transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-lg bg-emerald-100 text-[#166534] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">Exportar CSV</span>
              <span className="block text-xs text-muted-foreground">Planilha de transações</span>
            </span>
          </button>
          <button
            onClick={() => {
              onPDF()
              onClose()
            }}
            disabled={exporting}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-muted transition-colors text-left disabled:opacity-50"
          >
            <span className="w-9 h-9 rounded-lg bg-emerald-100 text-[#166534] flex items-center justify-center shrink-0">
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">Exportar PDF</span>
              <span className="block text-xs text-muted-foreground">Relatório em PDF</span>
            </span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * Expanding FAB menu for mobile. Renders a vertical stack of 4 options
 * above the FAB position with a staggered fade-in + slide-up animation,
 * and a transparent backdrop to close on outside tap.
 */
export function FabMenu({ open, onClose, onAction }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (open) {
      // next tick to trigger transition
      const t = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(t)
    } else {
      setMounted(false)
    }
  }, [open])

  if (!open) return null

  const items = [
    {
      key: 'transaction' as const,
      label: 'Nova Transação',
      icon: Plus,
      primary: true,
      delay: 0,
    },
    {
      key: 'scenario' as const,
      label: 'Simular Cenários',
      icon: Sparkles,
      primary: false,
      delay: 50,
    },
    {
      key: 'customize' as const,
      label: 'Personalizar',
      icon: SlidersHorizontal,
      primary: false,
      delay: 100,
    },
    {
      key: 'export' as const,
      label: 'Exportar',
      icon: Download,
      primary: false,
      delay: 150,
    },
  ]

  return (
    <>
      {/* transparent backdrop — closes the menu on outside tap */}
      <div
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 lg:hidden">
        <button
          onClick={onClose}
          className="lg:hidden mb-1 w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow flex items-center justify-center text-gray-500"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => {
                onClose()
                onAction({ type: item.key })
              }}
              style={{
                transitionDelay: `${mounted ? item.delay : 0}ms`,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              }}
              className={cn(
                'flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full bg-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-200 active:scale-95',
                item.primary && 'ring-2 ring-[#166534]/30',
              )}
            >
              <span
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  item.primary
                    ? 'bg-[#166534] text-white'
                    : 'bg-emerald-100 text-[#166534] dark:bg-emerald-900/40',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
