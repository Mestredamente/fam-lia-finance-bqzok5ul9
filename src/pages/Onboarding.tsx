import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, User, Home, Users, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { ClientResponseError } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PasswordInput } from '@/components/PasswordInput'
import { CurrencyInput } from '@/components/CurrencyInput'
import { TermsModal } from '@/components/TermsModal'
import { FixedBillsForm, type FixedBillEntry } from '@/components/FixedBillsForm'
import { MemberRole, roleLabels, type FamilyRecord } from '@/types/finance'
import { createFamily } from '@/services/families'
import { createMember } from '@/services/members'
import {
  validateInviteCode,
  joinFamily,
  generateInviteCode,
  createInvite,
} from '@/services/invites'
import { seedDefaultCategories } from '@/services/categories'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const step1Schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha mínima de 6 caracteres'),
})

export default function Onboarding() {
  const navigate = useNavigate()
  const { signUp, refreshData, isAuthenticated, user } = useAuth()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(isAuthenticated ? 2 : 1)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<MemberRole>('self')
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})

  const [familyOption, setFamilyOption] = useState<'create' | 'join'>('create')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [codeValid, setCodeValid] = useState<boolean | null>(null)
  const [validatedFamilyName, setValidatedFamilyName] = useState('')
  const [validationError, setValidationError] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState(5000)
  const [payDay, setPayDay] = useState<string>('5')
  const [dueNotifications, setDueNotifications] = useState(true)
  const [aiTips, setAiTips] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [familyError, setFamilyError] = useState('')
  const [fixedBills, setFixedBills] = useState<FixedBillEntry[]>([])

  const getPasswordStrength = () => {
    if (!password) return { label: 'Fraca', score: 0, color: 'bg-red-500' }
    if (password.length < 5) return { label: 'Fraca', score: 1, color: 'bg-red-500' }
    if (password.length < 7) return { label: 'Média', score: 2, color: 'bg-yellow-500' }
    return { label: 'Forte', score: 3, color: 'bg-emerald-500' }
  }

  const handleNextStep1 = async () => {
    const res = step1Schema.safeParse({ name, email, password })
    if (!res.success) {
      const errs: Record<string, string> = {}
      res.error.issues.forEach((i) => {
        if (i.path[0]) errs[String(i.path[0])] = i.message
      })
      setStep1Errors(errs)
      return
    }
    setStep1Errors({})
    setLoading(true)
    try {
      await signUp(email, password, name)
      setStep(2)
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.email) {
        setStep1Errors({
          email: 'Este e-mail já possui uma conta. Faça login para continuar.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: getPortugueseError(err),
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const [codeError, setCodeError] = useState('')

  const handleValidateCode = async () => {
    if (!inviteCode) return
    setCodeError('')
    setFamilyError('')
    const result = await validateInviteCode(inviteCode)
    if (result.valid) {
      setCodeValid(true)
      setValidatedFamilyName(result.family_name || '')
    } else {
      setCodeValid(false)
      setCodeError(
        result.error && result.error.trim()
          ? result.error
          : 'Convite inválido ou já utilizado. Solicite um novo convite.',
      )
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    setFamilyError('')
    try {
      const userId = pb.authStore.record?.id
      if (!userId) throw new Error('Falha ao obter ID do usuário')

      if (familyOption === 'create') {
        let familyId = ''

        try {
          const existingFamily = await pb
            .collection('families')
            .getFirstListItem<FamilyRecord>(`created_by = "${userId}"`)
          familyId = existingFamily.id
        } catch {
          const famName = familyName || `Família ${(name || user?.name || 'Usuário').split(' ')[0]}`
          const code = generateInviteCode()
          const family = await createFamily({
            name: famName,
            invite_code: code,
            created_by: userId,
          })
          familyId = family.id

          await seedDefaultCategories(familyId)

          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)
          await createInvite({
            family_id: familyId,
            invite_code: code,
            created_by: userId,
            expires_at: expiresAt.toISOString(),
          })
        }

        await createMember({
          family_id: familyId,
          user_id: userId,
          role,
          display_name: name || user?.name || 'Usuário',
          email: email || user?.email || '',
          monthly_income: monthlyIncome,
          payday: parseInt(payDay, 10),
          notify_bills: dueNotifications,
          notify_ai_tips: aiTips,
          share_data: true,
        })
      } else {
        if (!codeValid) {
          throw new Error('Código de convite não validado')
        }
        const joinResult = await joinFamily({
          invite_code: inviteCode.trim().toUpperCase(),
          user_id: userId,
          role,
          display_name: name || user?.name || 'Usuário',
          email: email || user?.email || '',
          monthly_income: monthlyIncome,
          payday: parseInt(payDay, 10),
          notify_bills: dueNotifications,
          notify_ai_tips: aiTips,
          share_data: true,
        })
        if (!joinResult.valid) {
          const joinError =
            joinResult.error || 'Convite inválido ou já utilizado. Solicite um novo convite.'
          if (joinError.includes('já faz parte')) {
            // User is already a member — proceed to dashboard
          } else {
            setFamilyError(joinError)
            setStep(2)
            throw new Error(joinError)
          }
        }
      }

      await refreshData()

      if (fixedBills.length > 0) {
        try {
          const memberRecords = await pb
            .collection('members')
            .getFullList({ filter: `user_id = "${userId}"`, limit: 1 })
          if (memberRecords.length > 0) {
            const m = memberRecords[0] as unknown as { id: string; family_id: string }
            for (const bill of fixedBills) {
              const instTotal = bill.installments_total || 1
              const instPaid = bill.installments_paid || 0
              await pb.collection('debts').create({
                family_id: m.family_id,
                owner_id: m.id,
                description: bill.description,
                type: bill.type,
                total_amount: bill.installment_value * instTotal,
                remaining_amount: bill.installment_value * Math.max(0, instTotal - instPaid),
                installment_value: bill.installment_value,
                installments_total: instTotal,
                installments_paid: instPaid,
                installments_remaining: Math.max(0, instTotal - instPaid),
                interest_rate: 0,
                due_day: bill.due_day,
                start_date: new Date().toISOString(),
                is_active: true,
                auto_create_transaction: true,
                status: 'active',
                frequency: 'monthly',
              })
            }
          }
        } catch {
          /* intentionally ignored */
        }
      }

      localStorage.setItem('ff_onboarding_complete', 'true')
      localStorage.setItem('ff_tour_pending', 'true')

      toast({ title: 'Conta criada!', description: 'Bem-vindo à Família Finance!' })
      navigate('/dashboard')
    } catch (err) {
      let displayMsg: string
      if (err instanceof ClientResponseError) {
        displayMsg = getPortugueseError(err)
      } else if (err instanceof Error && err.message) {
        displayMsg = err.message
      } else {
        displayMsg = getPortugueseError(err)
      }
      if (!displayMsg.includes('já faz parte')) {
        setFamilyError(displayMsg)
      }
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: displayMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  const strength = getPasswordStrength()

  return (
    <div className="w-full py-6 flex flex-col items-center">
      <p className="text-xs text-gray-500 text-center mb-4 max-w-xs">
        Finanças para quem mora junto — seja qual for o seu arranjo
      </p>
      <div className="w-full max-w-xs flex items-center justify-between mb-6">
        {[1, 2, 3, 4].map((s) => {
          const isDone = step > s
          const isCurrent = step === s
          return (
            <div key={s} className="flex items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  isDone || isCurrent ? 'bg-[#166534] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 h-1 mx-1 rounded-full ${step > s ? 'bg-[#166534]' : 'bg-gray-200'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      <Card className="w-full border-none shadow-elevation rounded-2xl bg-white p-6 sm:p-8 animate-fade-in-up">
        <CardContent className="p-0 space-y-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Criar sua conta</h2>
                <p className="text-xs text-gray-500">Passo 1 de 3: Dados pessoais</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Nome completo</label>
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={step1Errors.name ? 'border-red-500' : ''}
                  />
                  {step1Errors.name && (
                    <p className="text-xs text-red-500 mt-1">{step1Errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={step1Errors.email ? 'border-red-500' : ''}
                  />
                  {step1Errors.email && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-red-500">{step1Errors.email}</p>
                      {step1Errors.email.includes('já possui') && (
                        <Link to="/" className="text-xs text-[#16A34A] underline font-semibold">
                          Ir para o login
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">Senha</label>
                  <PasswordInput
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={step1Errors.password}
                  />
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1.5 w-full">
                        <div
                          className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-gray-200'}`}
                        />
                        <div
                          className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-gray-200'}`}
                        />
                        <div
                          className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-gray-200'}`}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        Força da senha: {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Seu papel no domicílio
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('self')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        role === 'self'
                          ? 'border-[#22C55E] bg-emerald-50 text-[#166534]'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs font-bold">Eu / Titular</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('partner')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        role === 'partner'
                          ? 'border-[#22C55E] bg-emerald-50 text-[#166534]'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs font-bold">Parceiro(a)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('husband')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        role === 'husband'
                          ? 'border-[#22C55E] bg-emerald-50 text-[#166534]'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs font-bold">Esposo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('wife')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        role === 'wife'
                          ? 'border-[#22C55E] bg-emerald-50 text-[#166534]'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs font-bold">Esposa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('roommate')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all col-span-2 ${
                        role === 'roommate'
                          ? 'border-[#22C55E] bg-emerald-50 text-[#166534]'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs font-bold">Colega de moradia</span>
                    </button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNextStep1}
                disabled={!name || !email || password.length < 6 || loading}
                className="w-full bg-[#166534] hover:bg-[#15803D] text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Criando conta...</span>
                  </div>
                ) : (
                  'Continuar'
                )}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Seu domicílio</h2>
                <p className="text-xs text-gray-500">Passo 2 de 3: Configuração do domicílio</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xs text-gray-600">
                  Você poderá adicionar outros membros (filhos, avós, etc.) a qualquer momento pelo
                  perfil.
                </p>
              </div>

              {familyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-600 font-medium">{familyError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFamilyOption('create')}
                  className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    familyOption === 'create'
                      ? 'border-[#22C55E] bg-emerald-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Home className="h-6 w-6 text-[#166534]" />
                  <span className="text-xs font-bold text-gray-900">Criar novo domicílio</span>
                  <span className="text-[10px] text-gray-500">
                    Você será o admin e poderá convidar quem mora com você
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFamilyOption('join')}
                  className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    familyOption === 'join'
                      ? 'border-[#22C55E] bg-emerald-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Users className="h-6 w-6 text-[#166534]" />
                  <span className="text-xs font-bold text-gray-900">Entrar em um domicílio</span>
                  <span className="text-[10px] text-gray-500">
                    Digite o código de convite recebido
                  </span>
                </button>
              </div>

              {familyOption === 'create' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Nome do domicílio</label>
                  <Input
                    placeholder="Ex: Casa dos Silva"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Código de convite (Ex: FAM-1234)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="FAM-XXXX"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value)
                        setCodeValid(null)
                        setCodeError('')
                        setFamilyError('')
                      }}
                    />
                    <Button
                      onClick={handleValidateCode}
                      variant="outline"
                      type="button"
                      className="shrink-0"
                    >
                      Validar
                    </Button>
                  </div>
                  {codeValid === true && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Família encontrada: {validatedFamilyName}
                    </p>
                  )}
                  {codeValid === false && (
                    <p className="text-xs text-red-500">
                      {codeError || 'Convite inválido ou já utilizado. Solicite um novo convite.'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="w-1/3">
                  Voltar
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={familyOption === 'join' && !codeValid}
                  className="w-2/3 bg-[#166534] hover:bg-[#15803D] text-white"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quase lá!</h2>
                <p className="text-xs text-gray-500">Passo 3 de 4: Renda e preferências</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Renda mensal individual
                  </label>
                  <CurrencyInput value={monthlyIncome} onChange={setMonthlyIncome} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Dia do mês que você recebe
                  </label>
                  <Select value={payDay} onValueChange={setPayDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
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

                <div className="pt-2 space-y-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      Notificações de vencimento
                    </span>
                    <Switch checked={dueNotifications} onCheckedChange={setDueNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      Dicas da IA consultora
                    </span>
                    <Switch checked={aiTips} onCheckedChange={setAiTips} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-1/3"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="w-2/3 bg-[#166534] hover:bg-[#15803D] text-white"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Contas fixas e dívidas</h2>
                <p className="text-xs text-gray-500">Passo 4 de 4: Compromissos mensais</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xs text-gray-600">
                  Você tem contas fixas mensais ou dívidas? Adicione-as agora ou pule este passo.
                </p>
              </div>

              {fixedBills.length > 0 && (
                <div className="space-y-2">
                  {fixedBills.map((bill, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          {bill.description}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFixedBills(fixedBills.filter((_, i) => i !== idx))}
                          className="text-xs text-red-500"
                        >
                          Remover
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {bill.type} · {formatBRL(bill.installment_value)} · Dia {bill.due_day}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <FixedBillsForm onAdd={(bill) => setFixedBills([...fixedBills, bill])} />

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(c) => setAcceptedTerms(!!c)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-gray-600 leading-tight">
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[#16A34A] underline font-semibold"
                  >
                    termos de uso e política de privacidade (LGPD)
                  </button>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="w-1/3"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading || !acceptedTerms}
                  className="w-2/3 bg-[#166534] hover:bg-[#15803D] text-white"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Criando conta...</span>
                    </div>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TermsModal open={showTermsModal} onOpenChange={setShowTermsModal} />
    </div>
  )
}
