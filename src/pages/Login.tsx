import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Home, Mail, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/PasswordInput'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const res = loginSchema.safeParse({ email, password })
    if (!res.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      res.error.issues.forEach((issue) => {
        if (issue.path[0] === 'email') fieldErrors.email = issue.message
        if (issue.path[0] === 'password') fieldErrors.password = issue.message
      })
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { hasFamily } = await login(email, password)
      toast({ title: 'Sucesso!', description: 'Bem-vindo à Família Finance!' })
      navigate(hasFamily ? '/dashboard' : '/onboarding')
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: getPortugueseError(err),
      })
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = email.length > 0 && password.length >= 6

  return (
    <div className="w-full py-8 flex items-center justify-center animate-fade-in-up">
      <Card className="w-full border-none shadow-elevation rounded-2xl bg-white p-6 sm:p-8">
        <CardContent className="p-0 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#166534] shadow-subtle mb-1">
              <Home className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Família Finance</h1>
            <p className="text-sm text-gray-500">
              Finanças para quem mora junto — seja qual for o seu arranjo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">E-mail</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setErrors((p) => ({ ...p, email: undefined }))
                  }}
                  disabled={loading}
                  className={`pl-9 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Senha</label>
              <PasswordInput
                placeholder="******"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrors((p) => ({ ...p, password: undefined }))
                }}
                disabled={loading}
                error={errors.password}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  toast({
                    title: 'Em breve',
                    description: 'Função de recuperação de senha em desenvolvimento.',
                  })
                }
                className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full h-11 bg-[#166534] hover:bg-[#15803D] text-white font-semibold rounded-lg shadow-subtle transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">Não tem conta? </span>
            <Link to="/onboarding" className="text-sm font-semibold text-[#16A34A] hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
