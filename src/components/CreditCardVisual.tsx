import { CreditCard as CreditCardIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'
import type { CreditCardRecord } from '@/types/finance'

const brandGradients: Record<string, string> = {
  Visa: 'linear-gradient(135deg, #1a1f71 0%, #2d4af5 100%)',
  Mastercard: 'linear-gradient(135deg, #cc0000 0%, #ff6600 100%)',
  Elo: 'linear-gradient(135deg, #1a1a1a 0%, #ffcb05 100%)',
  Amex: 'linear-gradient(135deg, #006fcf 0%, #2d8eff 100%)',
  Outros: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)',
}

interface Props {
  card: CreditCardRecord
  ownerName?: string
}

export function CreditCardVisual({ card, ownerName }: Props) {
  const gradient = brandGradients[card.card_brand] || brandGradients.Outros

  return (
    <div
      className="relative w-full aspect-[1.6/1] rounded-2xl p-5 shadow-lg overflow-hidden"
      style={{ background: gradient }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-12 -mt-12" />
      <div className="relative flex justify-between items-start">
        <div>
          <CreditCardIcon className="h-8 w-8 text-white/80 mb-2" />
          <h3 className="text-white font-bold text-lg leading-tight">{card.name}</h3>
        </div>
        <div className="text-right">
          <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
            {card.card_brand}
          </span>
          <div className="mt-1">
            {card.is_active ? (
              <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            ) : (
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end text-white">
        <div>
          <p className="text-xs opacity-70 uppercase">Fechamento</p>
          <p className="font-bold text-sm">Dia {card.closing_day}</p>
        </div>
        <div>
          <p className="text-xs opacity-70 uppercase">Vencimento</p>
          <p className="font-bold text-sm">Dia {card.due_day}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70 uppercase">Limite</p>
          <p className="font-bold text-sm">
            {card.credit_limit ? formatBRL(card.credit_limit) : '—'}
          </p>
        </div>
      </div>
      {ownerName && (
        <div className="absolute top-5 right-5">
          <p className="text-white/60 text-xs text-right">{ownerName}</p>
        </div>
      )}
    </div>
  )
}
