import { useState } from 'react'
import { Plus, CreditCard as CreditCardIcon, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCardVisual } from '@/components/CreditCardVisual'
import { CreditCardFormSheet } from '@/components/CreditCardFormSheet'

export default function Cards() {
  const { family, member } = useAuth()
  const navigate = useNavigate()
  const { cards, loading, error, refetch } = useCreditCards(family?.id)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Cartões</h1>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="bg-[#166534] hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="aspect-[1.6/1] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : cards.length === 0 ? (
        <Card className="border-dashed border-gray-200 rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <CreditCardIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nenhum cartão cadastrado</p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              Adicionar primeiro cartão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => navigate(`/cartoes/${card.id}/faturas`)}
              className="cursor-pointer group"
            >
              <CreditCardVisual card={card} ownerName={card.expand?.owner_id?.display_name} />
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-gray-500">
                  {card.expand?.owner_id?.display_name || '—'}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreditCardFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family?.id || ''}
        defaultOwnerId={member?.id || ''}
        onSaved={refetch}
      />
    </div>
  )
}
