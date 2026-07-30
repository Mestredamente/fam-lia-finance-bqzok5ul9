import { useState, useEffect } from 'react'

export function LoadingScreen({ message = 'Carregando...' }: { message?: string }) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex flex-col items-center justify-center bg-[#10B981]"
    >
      <div className="animate-fade-in">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="30" fill="white" />
          <text
            x="32"
            y="41"
            font-size="26"
            font-weight="bold"
            fill="#10B981"
            text-anchor="middle"
            font-family="system-ui, sans-serif"
          >
            FF
          </text>
        </svg>
      </div>
      <div className="mt-6 w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <p className="mt-4 text-white text-sm font-medium">{message}</p>
      <span className="sr-only">Carregando...</span>
      {slow && (
        <p className="mt-2 text-white/70 text-xs animate-fade-in max-w-xs text-center px-4">
          Está demorando mais que o normal. Verifique sua conexão.
        </p>
      )}
    </div>
  )
}
