import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/CurrencyInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createJournalEntry, updateJournalEntry } from '@/services/emotional-journal'
import { getTransactionsByMember } from '@/services/transactions'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { EMOTION_LIST, TRIGGER_SUGGESTIONS } from '@/lib/wellness-constants'
import { cn, formatBRL } from '@/lib/utils'
import type { EmotionalJournalRecord, TransactionRecord, EmotionType } from '@/types/finance'

const schema = z.object({
  emotion: z.string().min(1, 'Selecione uma emoção'),
  trigger: z.string().min(2, 'Gatilho muito curto'),
  note: z.string().max(500, 'Nota muito longa').optional().default(''),
  spending_amount: z.number().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  memberId: string
  editingEntry?: EmotionalJournalRecord | null
  onSaved?: () => void
}

export function EmotionalDiaryFormSheet({
  open,
  onOpenChange,
  familyId,
  memberId,
  editingEntry,
  onSaved,
}: Props) {
  const [emotion, setEmotion] = useState<string>('')
  const [trigger, setTrigger] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(0)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setEmotion(editingEntry.emotion)
        setTrigger(editingEntry.trigger)
        setNote(editingEntry.note || '')
        setAmount(editingEntry.spending_amount || 0)
        setTransactionId(editingEntry.transaction_id || null)
      } else {
        setEmotion('')
        setTrigger('')
        setNote('')
        setAmount(0)
        setTransactionId(null)
      }
      setErrors({})
      getTransactionsByMember(memberId)
        .then((txs) => {
          const today = new Date().toISOString().split('T')[0]
          setTransactions(txs.filter((t) => t.transaction_date.startsWith(today)).slice(0, 20))
        })
        .catch(() => {})
    }
  }, [open, editingEntry, memberId])

  const handleTransactionSelect = (txId: string) => {
    if (txId === 'none') {
      setTransactionId(null)
      return
    }
    setTransactionId(txId)
    const tx = transactions.find((t) => t.id === txId)
    if (tx) setAmount(tx.amount)
  }

  const handleSave = async () => {
    const result = schema.safeParse({
      emotion,
      trigger,
      note,
      spending_amount: amount || undefined,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        if (i.path[0]) errs[String(i.path[0])] = i.message
      })
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const data = {
        family_id: familyId,
        user_id: memberId,
        emotion: emotion as EmotionType,
        trigger,
        note: note || '',
        spending_amount: amount > 0 ? amount : null,
        transaction_id: transactionId,
      }
      if (editingEntry) {
        await updateJournalEntry(editingEntry.id, data)
        toast({ title: 'Entrada atualizada' })
      } else {
        await createJournalEntry(data)
        toast({ title: 'Entrada registrada no diário' })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editingEntry ? 'Editar Entrada' : 'Nova Entrada'}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Como você se sentiu?</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {EMOTION_LIST.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEmotion(e.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
                    emotion === e.value ? 'border-[#166534] bg-emerald-50' : 'border-gray-200',
                  )}
                >
                  <span className="text-xl">{e.emoji}</span>
                  <span className="text-xs text-gray-600 text-center leading-tight">{e.label}</span>
                </button>
              ))}
            </div>
            {errors.emotion && <p className="text-xs text-red-500 mt-1">{errors.emotion}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Gatilho</Label>
            <Input
              list="trigger-suggestions"
              placeholder="O que te levou a gastar?"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className={errors.trigger ? 'border-red-500' : ''}
            />
            <datalist id="trigger-suggestions">
              {TRIGGER_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {errors.trigger && <p className="text-xs text-red-500 mt-1">{errors.trigger}</p>}
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Nota</Label>
            <Textarea
              placeholder="Como você se sentiu? O que aconteceu antes de gastar?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-gray-400 mt-0.5">{note.length}/500</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Valor gasto (opcional)</Label>
            <CurrencyInput value={amount} onChange={setAmount} />
          </div>
          {transactions.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Linkar transação (opcional)
              </Label>
              <Select value={transactionId || 'none'} onValueChange={handleTransactionSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar transação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {transactions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.description} — {formatBRL(t.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !emotion || !trigger}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
