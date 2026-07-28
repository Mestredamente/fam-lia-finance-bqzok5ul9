import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export function PasswordInput({ className, error, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-1">
      <div className="relative flex items-center">
        <Lock className="absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'pl-9 pr-10',
            error && 'border-red-500 focus-visible:ring-red-500',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
