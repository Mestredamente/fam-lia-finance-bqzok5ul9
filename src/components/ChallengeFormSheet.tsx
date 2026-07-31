import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/CurrencyInput'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    title: string
    description: string
    targetValue: number | null
    durationDays: number
  }) => Promise<void>
}

export function ChallengeFormSheet({ open, onOpenChange, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetValue, setTargetValue] = useState(0)
  const [durationDays, setDurationDays] = useState(30)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        targetValue: targetValue > 0 ? targetValue : null,
        durationDays,
      })
      onOpenChange(false)
      setTitle('')
      setDescription('')
      setTargetValue(0)
      setDurationDays(30)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Criar desafio personalizado</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Economizar para viagem"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu objetivo..."
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Meta (R$) — opcional</Label>
            <CurrencyInput value={targetValue} onChange={setTargetValue} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Duração (dias)</Label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
              min={1}
              max={365}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !description.trim()}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando...
              </>
            ) : (
              'Criar desafio'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
