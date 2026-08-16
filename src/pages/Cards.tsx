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
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { EmptyState } from '@/components/EmptyState'

export default function Cards() {
  const { family, member } = useAuth()
  const navigate = useNavigate()
  const { cards, loading, error, refetch } = useCreditCards(family?.id)
  const [showForm, setShowForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-foreground">Cartões</h1>
        <Button
          onClick={() => setShowForm(true)}
          className="h-9 px-3 py-2 rounded-lg text-sm bg-[#166534] hover:bg-[#15803D]"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          role="status"
          aria-label="Carregando"
          aria-busy="true"
        >
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="aspect-[1.6/1] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-danger mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<CreditCardIcon />}
          title="Nenhum cartão cadastrado"
          actionLabel="Adicionar cartão"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => navigate(`/cards/${card.id}`)}
              className="cursor-pointer group"
            >
              <CreditCardVisual card={card} ownerName={card.expand?.owner_id?.display_name} />
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
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

      <button
        onClick={() => setShowTransactionForm(true)}
        aria-label="Adicionar transação"
        className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      <TransactionFormSheet
        open={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        familyId={family?.id || ''}
        ownerId={member?.id || ''}
        onSaved={refetch}
      />
    </div>
  )
}
