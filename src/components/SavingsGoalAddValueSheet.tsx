import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/CurrencyInput'
import { updateSavingsGoal } from '@/services/savings-goals'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { formatBRL } from '@/lib/utils'
import type { SavingsGoal } from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: SavingsGoal | null
  onSaved?: (completed: boolean) => void
}

const todayISO = () => new Date().toISOString().split('T')[0]

export function SavingsGoalAddValueSheet({ open, onOpenChange, goal, onSaved }: Props) {
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!goal) return
    if (amount <= 0) {
      setError('Valor deve ser maior que zero')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const newAmount = (goal.current_amount || 0) + amount
      const completed = newAmount >= goal.target_amount
      const data: Partial<SavingsGoal> = {
        current_amount: newAmount,
        status: completed ? 'completed' : goal.status,
        completed_at: completed ? new Date().toISOString() : goal.completed_at,
      }
      await updateSavingsGoal(goal.id, data)
      if (completed) {
        toast({
          title: `🎉 Meta "${goal.title}" atingida! Parabéns!`,
        })
      } else {
        toast({
          title: 'Valor adicionado',
          description: `${formatBRL(amount)} → ${formatBRL(newAmount)}`,
        })
      }
      onOpenChange(false)
      setAmount(0)
      setDate(todayISO())
      onSaved?.(completed)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: getPortugueseError(err),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Adicionar valor{goal ? ` — ${goal.title}` : ''}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {goal && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-0.5">
              <div className="flex justify-between">
                <span>Atual:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {formatBRL(goal.current_amount)} / {formatBRL(goal.target_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Faltam:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {formatBRL(Math.max(goal.target_amount - goal.current_amount, 0))}
                </span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="sga-amount" className="text-xs font-semibold text-gray-700">
              Valor
            </label>
            <CurrencyInput value={amount} onChange={setAmount} error={error || undefined} />
          </div>

          <div>
            <Label htmlFor="sga-date" className="text-xs font-semibold text-gray-700">
              Data (opcional)
            </Label>
            <Input
              id="sga-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || amount <= 0 || !goal}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adicionando...
              </>
            ) : (
              'Adicionar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
