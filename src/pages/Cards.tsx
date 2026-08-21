import { useState } from 'react'
import {
  Plus,
  CreditCard as CreditCardIcon,
  ChevronRight,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { deleteCreditCard } from '@/services/credit-cards'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCardVisual } from '@/components/CreditCardVisual'
import { CreditCardFormSheet } from '@/components/CreditCardFormSheet'
import { TransactionFormSheet } from '@/components/TransactionFormSheet'
import { EmptyState } from '@/components/EmptyState'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import type { CreditCardRecord } from '@/types/finance'

export default function Cards() {
  const { family, member } = useAuth()
  const navigate = useNavigate()
  const { cards, loading, error, refetch } = useCreditCards(family?.id)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCardRecord | null>(null)
  const [cardToDelete, setCardToDelete] = useState<CreditCardRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)

  const handleEdit = (e: React.MouseEvent, card: CreditCardRecord) => {
    e.stopPropagation()
    setEditingCard(card)
    setShowForm(true)
  }

  const handleDeletePrompt = (e: React.MouseEvent, card: CreditCardRecord) => {
    e.stopPropagation()
    setCardToDelete(card)
  }

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return
    setDeleting(true)
    try {
      await deleteCreditCard(cardToDelete.id)
      toast({ title: 'Cartão excluído com sucesso' })
      setCardToDelete(null)
      refetch()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cartão',
        description: err?.message || 'Não foi possível excluir o cartão.',
      })
    } finally {
      setDeleting(false)
    }
  }

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
        <Card className="border-amber-200 rounded-2xl">
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-sm text-amber-700">{error}</p>
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
            <div key={card.id} className="relative group">
              <div onClick={() => navigate(`/cards/${card.id}`)} className="cursor-pointer">
                <div className="relative">
                  <CreditCardVisual card={card} ownerName={card.expand?.owner_id?.display_name} />

                  {/* Kebab menu on top-right of card */}
                  <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white border-0 shadow-xs backdrop-blur-xs"
                          aria-label="Opções do cartão"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={(e) => handleEdit(e, card)}
                          className="cursor-pointer gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeletePrompt(e, card)}
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {card.expand?.owner_id?.display_name || '—'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreditCardFormSheet
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditingCard(null)
        }}
        familyId={family?.id || ''}
        defaultOwnerId={member?.id || ''}
        editingCard={editingCard}
        onSaved={() => {
          setEditingCard(null)
          refetch()
        }}
      />

      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as faturas vinculadas serão desvinculadas. As transações já criadas permanecem
              no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
