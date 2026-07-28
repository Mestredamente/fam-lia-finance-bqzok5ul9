import { DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (numValue: number) => void
  className?: string
  error?: string
}

export function CurrencyInput({ value, onChange, className, error }: CurrencyInputProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const num = raw ? parseInt(raw, 10) / 100 : 0
    onChange(num)
  }

  return (
    <div className="space-y-1">
      <div className="relative flex items-center">
        <DollarSign className="absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={formatCurrency(value)}
          onChange={handleChange}
          className={cn('pl-9 font-semibold text-gray-900', error && 'border-red-500', className)}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
