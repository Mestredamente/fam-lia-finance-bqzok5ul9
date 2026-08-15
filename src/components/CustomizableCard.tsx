import * as React from 'react'
import { Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardCardId } from '@/hooks/use-dashboard-layout'
import { CARD_TITLES, NON_HIDEABLE } from '@/hooks/use-dashboard-layout'

interface Props {
  id: DashboardCardId
  visible: boolean
  editMode: boolean
  isFirst: boolean
  isLast: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  children: React.ReactNode
}

/**
 * Wraps a dashboard card so it can be toggled and reordered when the dashboard
 * is in edit (personalization) mode. In normal mode it is transparent.
 *
 * Notes on the "hidden" state while in edit mode:
 *  - We keep rendering the card so the user can re-show it; we dim it and show
 *    a "oculto" badge instead of removing it entirely from the screen.
 */
export function CustomizableCard({
  id,
  visible,
  editMode,
  isFirst,
  isLast,
  onToggle,
  onMoveUp,
  onMoveDown,
  children,
}: Props) {
  const locked = NON_HIDEABLE.has(id)

  if (!editMode) {
    return <>{children}</>
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl transition-all',
        visible
          ? 'border-2 border-dashed border-indigo-400/70'
          : 'border-2 border-dashed border-gray-300 opacity-60',
      )}
    >
      {/* Edit-mode controls */}
      <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-full shadow-sm border border-gray-200 dark:border-zinc-700 px-1 py-0.5">
        <button
          type="button"
          aria-label={`Mover ${CARD_TITLES[id]} para cima`}
          disabled={isFirst}
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          className="h-6 w-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Mover ${CARD_TITLES[id]} para baixo`}
          disabled={isLast}
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          className="h-6 w-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {locked ? (
          <span
            title="Este card é sempre visível"
            className="h-6 w-6 flex items-center justify-center text-gray-300 cursor-not-allowed"
          >
            <Eye className="h-3.5 w-3.5" />
          </span>
        ) : (
          <button
            type="button"
            aria-label={visible ? `Ocultar ${CARD_TITLES[id]}` : `Mostrar ${CARD_TITLES[id]}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className={cn(
              'h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800',
              visible ? 'text-indigo-600' : 'text-gray-400',
            )}
          >
            {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {!visible && (
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            Oculto
          </span>
        </div>
      )}

      <div className="pointer-events-none [&>*]:pointer-events-none">{children}</div>
    </div>
  )
}
