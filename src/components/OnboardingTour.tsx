import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TourStep {
  target: string
  title: string
  desc: string
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="dashboard-summary"]',
    title: 'Resumo Financeiro',
    desc: 'Aqui você vê receitas, despesas, saldo e seu score de saúde financeira. Use as setas ou o seletor de período (hoje, semana, mês, ano ou tudo) para navegar.',
  },
  {
    target: '[data-tour="add-transaction"]',
    title: 'Adicionar Transação',
    desc: 'Toque no botão + para registrar receitas, despesas, investimentos e pagamentos de dívidas.',
  },
  {
    target: '[data-tour="nav-cards"]',
    title: 'Cartões e Faturas',
    desc: 'Cadastre cartões com limite de crédito, importe faturas em PDF e acompanhe o limite usado e disponível de cada cartão.',
  },
  {
    target: '[data-tour="nav-transacoes"]',
    title: 'Transações',
    desc: 'Veja o histórico detalhado, filtre por membro e analise gastos por categoria ao longo do tempo.',
  },
  {
    target: '[data-tour="nav-cards"]',
    title: 'Importação de Faturas',
    desc: 'Faça upload do PDF da fatura. A IA extrai os itens automaticamente. Revise, categorize, exclua itens e confirme para converter em transações. Marque como paga quando quitar.',
  },
  {
    target: '[data-tour="nav-consultora"]',
    title: 'Consultora IA',
    desc: 'Converse com a IA financeira, receba dicas personalizadas, faça simulações e acesse a terapia financeira emocional.',
  },
]

export function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const endTour = useCallback(() => {
    setActive(false)
    localStorage.removeItem('ff_tour_pending')
    localStorage.setItem('ff_tour_completed', 'true')
  }, [])

  useEffect(() => {
    if (localStorage.getItem('ff_tour_pending') === 'true') {
      const t = setTimeout(() => setActive(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    const updateRect = () => {
      const el = document.querySelector(TOUR_STEPS[step].target)
      setRect(el?.getBoundingClientRect() ?? null)
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    const interval = setInterval(updateRect, 500)
    return () => {
      window.removeEventListener('resize', updateRect)
      clearInterval(interval)
    }
  }, [active, step])

  if (!active) return null

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.bottom + 12,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 300)),
        width: 280,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280,
      }

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={endTour} />
      {rect && (
        <div
          className="absolute rounded-lg transition-all duration-200"
          style={{
            position: 'fixed',
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        />
      )}
      <div
        style={tooltipStyle}
        className="bg-white rounded-xl shadow-2xl p-4 animate-fade-in-up z-[61]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-emerald-600">
            {step + 1} de {TOUR_STEPS.length}
          </span>
          <button onClick={endTour} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-bold text-sm text-gray-900">{current.title}</h3>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{current.desc}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={endTour}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            Pular tour
          </button>
          <Button
            size="sm"
            className="bg-[#166534] hover:bg-[#15803D] h-8 text-xs"
            onClick={() => {
              if (isLast) endTour()
              else setStep((s) => s + 1)
            }}
          >
            {isLast ? 'Concluir' : 'Próximo'}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
