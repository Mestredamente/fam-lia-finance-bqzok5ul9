import { useState, useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  format?: (val: number) => string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 500,
  format,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const currentRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = currentRef.current
    const start = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (value - from) * eased
      currentRef.current = current
      setDisplay(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const formatted = format ? format(display) : Math.round(display).toString()
  return <span className={className}>{formatted}</span>
}
