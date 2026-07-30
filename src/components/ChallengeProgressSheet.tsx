import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/CurrencyInput'
import { Label } from '@/components/ui/label'
import type { ChallengeRecord } from '@/types/finance'
import { formatBRL } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  challenge: ChallengeRecord | null
  onSubmit: (increment: number) => Promise<{ completed: boolean; failed: boolean; points: number }>
}

export function ChallengeProgressSheet({ open, onOpenChange, challenge, onSubmit }: Props) {
  const [amount, setAmount] = useState(0)
  const [saving, setSaving] = useState(false)

  if (!challenge) return null

  const isNumeric =
    challenge.type === 'savings_goal' &&
    challenge.target_value !== null &&
    challenge.target_value > 0

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const increment = isNumeric ? amount : 1
      await onSubmit(increment)
      onOpenChange(false)
      setAmount(0)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Registrar progresso</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-bold text-gray-900">{challenge.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Progresso:{' '}
              {isNumeric
                ? `${formatBRL(challenge.current_value || 0)} de ${formatBRL(challenge.target_value || 0)}`
                : `${challenge.current_value || 0} / ${challenge.target_value || 0} dias`}
            </p>
          </div>
          {isNumeric ? (
            <div>
              <Label className="text-xs font-semibold text-gray-700">Quanto você economizou?</Label>
              <CurrencyInput value={amount} onChange={setAmount} />
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-4">
              Marque mais um dia de progresso no seu desafio!
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={saving || (isNumeric && amount <= 0)}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
              </>
            ) : (
              'Registrar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
