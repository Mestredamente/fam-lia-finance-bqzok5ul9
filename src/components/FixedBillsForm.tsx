import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FixedBillEntry {
  type: string
  description: string
  installment_value: number
  installments_total: number
  installments_paid: number
  due_day: number
}

const BILL_TYPES = [
  { value: 'rent', label: 'Aluguel' },
  { value: 'condo', label: 'Condomínio' },
  { value: 'utility', label: 'Contas (Luz/Água/Gás/Internet)' },
  { value: 'financing', label: 'Financiamento' },
  { value: 'loan', label: 'Empréstimo' },
  { value: 'subscription', label: 'Assinatura (streaming)' },
]

export function FixedBillsForm({ onAdd }: { onAdd: (bill: FixedBillEntry) => void }) {
  const [type, setType] = useState('rent')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [total, setTotal] = useState('')
  const [paid, setPaid] = useState('')
  const [dueDay, setDueDay] = useState('5')

  const handleAdd = () => {
    if (!description || !value) return
    onAdd({
      type,
      description,
      installment_value: parseFloat(value) || 0,
      installments_total: parseInt(total) || 1,
      installments_paid: parseInt(paid) || 0,
      due_day: parseInt(dueDay) || 5,
    })
    setDescription('')
    setValue('')
    setTotal('')
    setPaid('')
  }

  return (
    <div className="space-y-2 p-3 border border-gray-200 rounded-xl">
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BILL_TYPES.map((t) => (
            <SelectItem key={t.label} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Descrição (ex: Aluguel do apto)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-9 text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Valor (R$)"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 text-xs"
        />
        <Select value={dueDay} onValueChange={setDueDay}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Vencimento" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <SelectItem key={d} value={d.toString()}>
                Dia {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Total parcelas"
          type="number"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          className="h-9 text-xs"
        />
        <Input
          placeholder="Parcelas pagas"
          type="number"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          className="h-9 text-xs"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={!description || !value}
        className="w-full bg-[#166534] hover:bg-[#15803D] text-white"
      >
        <Plus className="h-4 w-4 mr-1" /> Adicionar
      </Button>
    </div>
  )
}
