import { useState, useEffect } from 'react'
import {
  Landmark,
  Wallet,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Building2,
  DollarSign,
  Briefcase,
  Coins,
  ShieldCheck,
  Check,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/CurrencyInput'
import { cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types/accounts'

export const ACCOUNT_ICONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'landmark', label: 'Banco', icon: Landmark },
  { id: 'wallet', label: 'Carteira', icon: Wallet },
  { id: 'piggy-bank', label: 'Poupança', icon: PiggyBank },
  { id: 'trending-up', label: 'Investimento', icon: TrendingUp },
  { id: 'credit-card', label: 'Cartão/Conta', icon: CreditCard },
  { id: 'building-2', label: 'Instituição', icon: Building2 },
  { id: 'dollar-sign', label: 'Dinheiro', icon: DollarSign },
  { id: 'briefcase', label: 'Comercial', icon: Briefcase },
  { id: 'coins', label: 'Moedas', icon: Coins },
  { id: 'shield-check', label: 'Reserva', icon: ShieldCheck },
]

export function getAccountIcon(id?: string): LucideIcon {
  const found = ACCOUNT_ICONS.find((i) => i.id === id)
  return found ? found.icon : Landmark
}

export const ACCOUNT_COLORS = [
  '#10B981', // Emerald
  '#059669', // Dark Emerald
  '#2563EB', // Blue
  '#0284C7', // Sky
  '#7C3AED', // Violet
  '#9333EA', // Purple
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#D97706', // Amber
  '#4B5563', // Gray
  '#0F172A', // Slate
  '#0D9488', // Teal
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
  onSave: (data: {
    name: string
    type: AccountType
    bank?: string
    initial_balance: number
    color?: string
    icon?: string
    is_active?: boolean
  }) => Promise<void>
}

export function AccountFormSheet({ open, onOpenChange, account, onSave }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [bank, setBank] = useState('')
  const [initialBalance, setInitialBalance] = useState(0)
  const [color, setColor] = useState(ACCOUNT_COLORS[0])
  const [icon, setIcon] = useState('landmark')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})

  useEffect(() => {
    if (open) {
      if (account) {
        setName(account.name || '')
        setType(account.type || 'checking')
        setBank(account.bank || '')
        setInitialBalance(Number(account.initial_balance || 0))
        setColor(account.color || ACCOUNT_COLORS[0])
        setIcon(account.icon || 'landmark')
        setIsActive(account.is_active !== false)
      } else {
        setName('')
        setType('checking')
        setBank('')
        setInitialBalance(0)
        setColor(ACCOUNT_COLORS[0])
        setIcon('landmark')
        setIsActive(true)
      }
      setErrors({})
    }
  }, [open, account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: 'Nome da conta é obrigatório' })
      return
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        type,
        bank: bank.trim() || undefined,
        initial_balance: initialBalance || 0,
        color,
        icon,
        is_active: isActive,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] rounded-t-2xl flex flex-col sm:max-w-md sm:mx-auto"
      >
        <SheetHeader className="text-left shrink-0">
          <SheetTitle>{account ? 'Editar Conta' : 'Nova Conta Bancária'}</SheetTitle>
          <SheetDescription>
            {account
              ? 'Atualize os dados e configurações da conta.'
              : 'Cadastre suas contas correntes, poupanças, carteiras ou contas de investimento.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 py-2 pr-1">
          {/* Nome */}
          <div>
            <Label
              htmlFor="acc-name"
              className="text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              Nome da conta *
            </Label>
            <Input
              id="acc-name"
              placeholder="Ex: Nubank, Itaú Principal, Carteira Física"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({})
              }}
              className={cn('mt-1', errors.name && 'border-red-500')}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Tipo de conta */}
          <div>
            <Label
              htmlFor="acc-type"
              className="text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              Tipo de conta *
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id="acc-type" className="mt-1">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Conta Corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
                <SelectItem value="wallet">Carteira / Dinheiro</SelectItem>
                <SelectItem value="investment">Conta de Investimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Banco / Instituição */}
          <div>
            <Label
              htmlFor="acc-bank"
              className="text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              Banco / Instituição (opcional)
            </Label>
            <Input
              id="acc-bank"
              placeholder="Ex: Nubank, Itaú, Bradesco, Inter"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Saldo inicial */}
          <div>
            <Label
              htmlFor="acc-balance"
              className="text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              Saldo Inicial
            </Label>
            <CurrencyInput
              id="acc-balance"
              value={initialBalance}
              onChange={setInitialBalance}
              placeholder="R$ 0,00"
              className="mt-1"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Saldo da conta no momento do cadastro. O saldo atual somará/subtrairá as transações
              vinculadas.
            </p>
          </div>

          {/* Ícone */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-200 block mb-1.5">
              Ícone
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {ACCOUNT_ICONS.map((item) => {
                const IconComp = item.icon
                const isSelected = icon === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    title={item.label}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all gap-1',
                      isSelected
                        ? 'border-[#166534] bg-emerald-50 dark:bg-emerald-950/40 text-[#166534] dark:text-emerald-400'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400',
                    )}
                  >
                    <IconComp className="h-5 w-5" />
                    <span className="text-[9px] truncate max-w-[50px]">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cor */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-200 block mb-1.5">
              Cor do Card
            </Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-transform',
                    color === c
                      ? 'scale-110 ring-2 ring-offset-2 ring-gray-400'
                      : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                >
                  {color === c && <Check className="h-4 w-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Status Ativo */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
            <div>
              <Label
                htmlFor="acc-active"
                className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                Conta ativa
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Contas inativas não entram no saldo total do topo
              </p>
            </div>
            <Switch id="acc-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Botões */}
          <div className="sticky bottom-0 bg-white dark:bg-card border-t border-gray-100 dark:border-gray-800 pt-3 pb-1 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-1/3"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-2/3 bg-[#166534] hover:bg-[#15803D] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : account ? (
                'Salvar Alterações'
              ) : (
                'Criar Conta'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
