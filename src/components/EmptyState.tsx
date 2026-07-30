import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center animate-fade-in',
        className,
      )}
    >
      <div className="opacity-50 mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 bg-[#166534] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
