import { useState, useRef } from 'react'
import { Upload, Loader2, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { importBankStatement, type ParsedTransaction } from '@/services/bank-import'
import { createTransaction } from '@/services/transactions'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface EditableTx extends ParsedTransaction {
  category_id: string | null
}

interface CategoryOption {
  id: string
  name: string
  type: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  memberId: string
  onImported: () => void
}

export function BankImportSheet({ open, onOpenChange, familyId, memberId, onImported }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [transactions, setTransactions] = useState<EditableTx[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const result = await importBankStatement(file, familyId)
      setCategories(result.categories)
      setTransactions(
        result.transactions.map((t) => ({ ...t, category_id: t.suggested_category_id })),
      )
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao importar extrato' })
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const updateTx = (idx: number, field: keyof EditableTx, value: string | null) => {
    setTransactions((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }

  const handleSave = async () => {
    setSaving(true)
    let created = 0
    for (const tx of transactions) {
      if (!tx.category_id) continue
      try {
        await createTransaction({
          family_id: familyId,
          owner_id: memberId,
          category_id: tx.category_id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          transaction_date: tx.transaction_date,
          is_shared: false,
          is_fixed: false,
          source: 'manual',
        })
        created++
      } catch {
        /* skip */
      }
    }
    setSaving(false)
    setTransactions([])
    onOpenChange(false)
    onImported()
    toast({ title: `${created} transações importadas!` })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar extrato</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.ofx"
            className="hidden"
            onChange={handleFile}
          />
          {transactions.length === 0 ? (
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full bg-[#166534] hover:bg-[#15803D]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Processando...' : 'Selecionar arquivo CSV/OFX'}
            </Button>
          ) : (
            <>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {transactions.map((tx, i) => (
                  <div key={i} className="p-3 border border-gray-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={tx.description}
                        onChange={(e) => updateTx(i, 'description', e.target.value)}
                        className="flex-1 h-8 text-sm"
                      />
                      <span
                        className={cn(
                          'text-sm font-bold whitespace-nowrap',
                          tx.type === 'income' ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatBRL(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{tx.transaction_date}</span>
                      <Select
                        value={tx.category_id || ''}
                        onValueChange={(v) => updateTx(i, 'category_id', v)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((c) => c.type === tx.type || c.type === 'expense')
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#166534] hover:bg-[#15803D]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Importando...' : `Importar ${transactions.length} transações`}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
