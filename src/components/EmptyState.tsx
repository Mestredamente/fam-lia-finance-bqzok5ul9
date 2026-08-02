import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  actionDisabled?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  actionDisabled,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center animate-fade-in',
        className,
      )}
    >
      <div
        className="mb-4 [&_svg]:h-16 [&_svg]:w-16"
        style={{ animation: 'pageEnter 300ms ease-out', color: '#6B7280' }}
      >
        {icon}
      </div>
      <h3 className="text-base font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={actionDisabled}
          className={cn(
            'mt-4 px-5 py-2.5 bg-[#166534] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg transition-all active:scale-95',
            actionDisabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
