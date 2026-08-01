import { useState, useRef, useCallback, ReactNode } from 'react'

const THRESHOLD = 100

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const isPulling = useRef(false)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (window.scrollY === 0 && !refreshing) {
        startY.current = e.touches[0].clientY
        isPulling.current = false
      } else {
        startY.current = null
      }
    },
    [refreshing],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current === null || refreshing) return
      const dist = e.touches[0].clientY - startY.current
      if (dist > 0 && window.scrollY === 0) {
        isPulling.current = true
        setPull(Math.min(dist * 0.3, THRESHOLD * 1.5))
      } else if (dist <= 0) {
        isPulling.current = false
        setPull(0)
      }
    },
    [refreshing],
  )

  const onTouchEnd = useCallback(async () => {
    if (startY.current === null) return
    startY.current = null
    if (pull >= THRESHOLD && !refreshing && isPulling.current) {
      setRefreshing(true)
      setPull(40)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
    isPulling.current = false
  }, [pull, refreshing, onRefresh])

  const progress = Math.min(pull / THRESHOLD, 1)

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-xs text-gray-500 transition-all duration-200"
        style={{
          height: pull || (refreshing ? 40 : 0),
          opacity: pull > 0 || refreshing ? 1 : 0,
        }}
      >
        {refreshing ? (
          <span className="animate-pulse font-medium">Atualizando...</span>
        ) : progress >= 1 ? (
          <span className="font-medium">Solte para atualizar</span>
        ) : (
          <span>Puxe para atualizar</span>
        )}
      </div>
      {children}
    </div>
  )
}
