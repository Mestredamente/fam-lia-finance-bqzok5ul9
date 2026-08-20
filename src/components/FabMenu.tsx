import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Upload, CreditCard, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

export interface FabMenuAction {
  type: 'transaction' | 'scenario' | 'customize' | 'export' | 'invoice' | 'ddc' | 'bill'
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
 * Global Desktop FAB menu (lg+) & Mobile compatibility.
 * When open, displays 4 actions:
 * 1. "Nova transação" -> dispatch event 'ff-open-transaction-form'
 * 2. "Importar fatura" -> navigate('/cards') + dispatch 'ff-open-invoice-form'
 * 3. "Importar DDC" -> dispatch event 'ff-open-ddc-import'
 * 4. "Pagar conta" -> navigate('/contas')
 */
export function FabMenu({
  open: controlledOpen,
  onClose: controlledOnClose,
  onAction: controlledOnAction,
}: {
  open?: boolean
  onClose?: () => void
  onAction?: (a: FabMenuAction) => void
} = {}) {
  const navigate = useNavigate()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalOpen(false)
    }
  }

  const toggleOpen = () => {
    if (isControlled) {
      if (isOpen && controlledOnClose) controlledOnClose()
    } else {
      setInternalOpen((v) => !v)
    }
  }

  const handleAction = (type: FabMenuAction['type']) => {
    handleClose()
    if (controlledOnAction) {
      controlledOnAction({ type })
    }

    if (type === 'transaction') {
      window.dispatchEvent(new CustomEvent('ff-open-transaction-form'))
    } else if (type === 'invoice') {
      navigate('/cards')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ff-open-invoice-form'))
      }, 250)
    } else if (type === 'ddc') {
      window.dispatchEvent(new CustomEvent('ff-open-ddc-import'))
    } else if (type === 'bill') {
      navigate('/contas')
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const menuItems = [
    {
      key: 'transaction' as const,
      label: 'Nova transação',
      icon: Plus,
      color: 'bg-emerald-100 text-[#166534] dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    {
      key: 'invoice' as const,
      label: 'Importar fatura',
      icon: FileText,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    },
    {
      key: 'ddc' as const,
      label: 'Importar DDC',
      icon: Upload,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
    },
    {
      key: 'bill' as const,
      label: 'Pagar conta',
      icon: CreditCard,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    },
  ]

  return (
    <div ref={containerRef} className="hidden lg:block">
      {/* Semi-transparent backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 transition-opacity animate-fade-in"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Action options popup */}
      <div
        className={cn(
          'fixed bottom-24 right-8 z-40 flex flex-col items-end gap-2.5 transition-all duration-200 pointer-events-none',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
            : 'opacity-0 translate-y-4 scale-95',
        )}
      >
        {menuItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => handleAction(item.key)}
              style={{
                transitionDelay: isOpen ? `${idx * 40}ms` : '0ms',
              }}
              className="flex items-center gap-3 pl-3.5 pr-4 py-2.5 rounded-full bg-white dark:bg-card border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all text-left"
            >
              <span
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  item.color,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main Trigger Button (Desktop) */}
      <button
        onClick={toggleOpen}
        aria-label={isOpen ? 'Fechar menu de ações' : 'Adicionar / Ações rápidas'}
        aria-expanded={isOpen}
        className={cn(
          'fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-xl ring-4 ring-white/60 dark:ring-gray-900/60 transition-all duration-300 active:scale-95 cursor-pointer',
        )}
      >
        <Plus
          className={cn(
            'h-6 w-6 transition-transform duration-300',
            isOpen ? 'rotate-45 text-white' : 'rotate-0',
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
