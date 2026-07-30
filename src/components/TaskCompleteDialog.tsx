import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/CurrencyInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/use-categories'
import { taskToCategoryName } from '@/lib/household-icons'
import type {
  HouseholdTaskRecord,
  CompleteTaskOptions,
  ShoppingItem,
} from '@/types/household-tasks'
import type { MemberRecord } from '@/types/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: HouseholdTaskRecord | null
  familyId: string
  members: MemberRecord[]
  onComplete: (options: CompleteTaskOptions) => Promise<void>
}

export function TaskCompleteDialog({
  open,
  onOpenChange,
  task,
  familyId,
  members,
  onComplete,
}: Props) {
  const { categories } = useCategories(familyId)
  const [actualCost, setActualCost] = useState(0)
  const [createTx, setCreateTx] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && task) {
      const shoppingTotal = (task.shopping_items || []).reduce(
        (s, i) => s + (i as ShoppingItem).estimated_price * (i as ShoppingItem).quantity,
        0,
      )
      const cost = task.estimated_cost || shoppingTotal || 0
      setActualCost(cost)
      setCreateTx(cost > 0)
      setOwnerId(task.assigned_to || task.created_by)
      setTxDate(new Date().toISOString().split('T')[0])
      const defaultName = taskToCategoryName[task.category]
      const expenseCats = (categories as { id: string; name: string; type: string }[]).filter(
        (c) => c.type === 'expense',
      )
      const match = expenseCats.find((c) => c.name === defaultName)
      setCategoryId(match?.id || expenseCats[0]?.id || '')
    }
  }, [open, task, categories])

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onComplete({
        actual_cost: actualCost > 0 ? actualCost : null,
        create_transaction: createTx && actualCost > 0,
        transaction_category_id: categoryId,
        transaction_owner_id: ownerId,
        transaction_date: new Date(txDate + 'T12:00:00').toISOString(),
      })
      onOpenChange(false)
    } catch {
      /* handled by parent */
    } finally {
      setSaving(false)
    }
  }

  if (!task) return null
  const expenseCats = (categories as { id: string; name: string; type: string }[]).filter(
    (c) => c.type === 'expense',
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-gray-700">Custo real</Label>
            <CurrencyInput value={actualCost} onChange={setActualCost} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Criar transação a partir desta tarefa</Label>
            <Switch checked={createTx} onCheckedChange={setCreateTx} disabled={actualCost <= 0} />
          </div>
          {createTx && actualCost > 0 && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Responsável</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Data</Label>
                <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
