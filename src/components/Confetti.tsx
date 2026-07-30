import { useMemo } from 'react'

export function Confetti({ show }: { show: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: ['#22C55E', '#166534', '#FCD34D', '#3B82F6', '#EF4444', '#A855F7'][i % 6],
        delay: Math.random() * 0.3,
        duration: 1 + Math.random() * 0.8,
        size: 6 + Math.random() * 6,
      })),
    [],
  )

  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: '2px',
              animation: `confetti-fall ${p.duration}s cubic-bezier(0.4, 0, 1, 1) ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
    </>
  )
}
