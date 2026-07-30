import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/CurrencyInput'
import { formatBRL } from '@/lib/utils'
import type { ShoppingItem } from '@/types/household-tasks'

interface Props {
  items: ShoppingItem[]
  onChange: (items: ShoppingItem[]) => void
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function ShoppingListBuilder({ items, onChange }: Props) {
  const addItem = () => {
    onChange([
      ...items,
      {
        id: genId(),
        name: '',
        quantity: 1,
        estimated_price: 0,
        actual_price: null,
        checked: false,
      },
    ])
  }
  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id))
  const updateItem = (id: string, field: keyof ShoppingItem, value: unknown) =>
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  const total = items.reduce((s, i) => s + i.estimated_price * i.quantity, 0)

  return (
    <div className="space-y-2 p-3 border border-gray-200 rounded-xl bg-gray-50">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            placeholder="Item"
            value={item.name}
            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
            className="w-14 h-9 text-sm text-center"
          />
          <div className="w-28">
            <CurrencyInput
              value={item.estimated_price}
              onChange={(v) => updateItem(item.id, 'estimated_price', v)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-1" /> Adicionar item
      </Button>
      {items.length > 0 && (
        <div className="flex justify-between text-xs font-semibold text-gray-700 pt-1">
          <span>Total estimado</span>
          <span>{formatBRL(total)}</span>
        </div>
      )}
    </div>
  )
}
