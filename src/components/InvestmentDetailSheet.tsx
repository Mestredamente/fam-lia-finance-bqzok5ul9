import { useState, useEffect } from 'react'
import { Pencil, Trash2, TrendingUp, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/CurrencyInput'
import { getInvestmentMeta, interestTypeLabels } from '@/lib/patrimony-icons'
import { updateInvestment } from '@/services/investments'
import { formatBRL, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { InvestmentRecord } from '@/types/finance'

interface Props {
  investment: InvestmentRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function InvestmentDetailSheet({
  investment,
  open,
  onOpenChange,
  isOwner,
  onEdit,
  onDelete,
}: Props) {
  const [showUpdateValue, setShowUpdateValue] = useState(false)
  const [newValue, setNewValue] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && investment) {
      setNewValue(investment.current_value)
      setShowUpdateValue(false)
    }
  }, [open, investment])

  if (!investment) return null

  const meta = getInvestmentMeta(investment.type)
  const Icon = meta.icon
  const ret = investment.current_value - investment.amount_invested
  const retPct = investment.amount_invested > 0 ? (ret / investment.amount_invested) * 100 : 0

  const handleUpdateValue = async () => {
    setSaving(true)
    try {
      await updateInvestment(investment.id, { current_value: newValue })
      toast({ title: 'Valor atualizado' })
      onOpenChange(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar valor' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">Detalhes do Investimento</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: meta.color + '20' }}
            >
              <Icon className="h-6 w-6" style={{ color: meta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900">{investment.name}</h3>
              <p className="text-sm text-gray-500">{investment.institution}</p>
            </div>
            <Badge style={{ backgroundColor: meta.color + '20', color: meta.color }}>
              {meta.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500 block">Valor investido</span>
              <span className="text-sm font-bold text-gray-900">
                {formatBRL(investment.amount_invested)}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500 block">Valor atual</span>
              <span className="text-sm font-bold text-gray-900">
                {formatBRL(investment.current_value)}
              </span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
            <span className="text-xs text-gray-500">Rendimento</span>
            <span className={cn('text-sm font-bold', ret >= 0 ? 'text-[#22C55E]' : 'text-red-600')}>
              {formatBRL(ret)} ({retPct.toFixed(1)}%)
            </span>
          </div>
          {investment.interest_rate && (
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <span className="text-xs text-gray-500">Taxa</span>
              <span className="text-sm font-medium text-gray-900">
                {investment.interest_rate}%
                {investment.interest_type ? ` ${interestTypeLabels[investment.interest_type]}` : ''}
              </span>
            </div>
          )}
          {investment.maturity_date && (
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <span className="text-xs text-gray-500">Vencimento</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(investment.maturity_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          {investment.notes && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-500 block mb-1">Observações</span>
              <p className="text-sm text-gray-700">{investment.notes}</p>
            </div>
          )}
          {investment.expand?.owner_id && (
            <p className="text-xs text-gray-500 text-center">
              Titular: {investment.expand.owner_id.display_name}
            </p>
          )}
          {showUpdateValue && (
            <div className="space-y-2 p-3 border border-gray-200 rounded-xl">
              <span className="text-xs font-semibold text-gray-700">Novo valor atual</span>
              <CurrencyInput value={newValue} onChange={setNewValue} />
              <Button
                onClick={handleUpdateValue}
                disabled={saving || newValue <= 0}
                size="sm"
                className="w-full bg-[#166534] hover:bg-[#15803D]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Confirmar
              </Button>
            </div>
          )}
          {isOwner && !showUpdateValue && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowUpdateValue(true)}>
                <TrendingUp className="h-4 w-4 mr-1" /> Atualizar valor
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
