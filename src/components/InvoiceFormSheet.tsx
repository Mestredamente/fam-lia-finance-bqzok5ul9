import { useState, useRef } from 'react'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/CurrencyInput'
import { createInvoice, parseInvoice } from '@/services/invoices'
import { getCreditCard } from '@/services/credit-cards'
import { toast } from '@/hooks/use-toast'
import { useAnnouncer } from '@/hooks/use-announcer'
import { detectErrorCode, getErrorConfig } from '@/lib/invoice-errors'
import { cn } from '@/lib/utils'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const schema = z.object({
  month: z.number().min(0).max(11),
  year: z.number().min(2020).max(2050),
  total_amount: z.number().positive('Valor deve ser maior que zero'),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string
  familyId: string
  onSaved?: () => void
}

export function InvoiceFormSheet({ open, onOpenChange, cardId, familyId, onSaved }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [amount, setAmount] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [useAI, setUseAI] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const { announce } = useAnnouncer()

  const validateFile = (f: File): boolean => {
    if (f.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Máximo 10MB' })
      return false
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Apenas PDF, JPG e PNG',
      })
      return false
    }
    return true
  }

  const handleFile = (f: File | undefined) => {
    if (f && validateFile(f)) setFile(f)
  }

  const handleSave = async () => {
    const result = schema.safeParse({ month, year, total_amount: amount })
    if (!result.success) {
      const errs: Record<string, string> = {}
      result.error.issues.forEach((i) => {
        if (i.path[0]) errs[String(i.path[0])] = i.message
      })
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const card = await getCreditCard(cardId)
      const monthRef = `${year}-${String(month + 1).padStart(2, '0')}-01 00:00:00`
      const created = await createInvoice({
        card_id: cardId,
        family_id: familyId,
        owner_id: card.owner_id,
        month_ref: monthRef,
        total_amount: amount,
        status: 'pending',
        ...(file ? { raw_file_url: file } : {}),
      })
      if (file && useAI) {
        toast({ title: 'Fatura criada! Processando com IA...' })
        announce('Fatura criada')
        parseInvoice(created.id).catch((err) => {
          const code = detectErrorCode(err)
          const config = getErrorConfig(code)
          toast({
            variant: 'destructive',
            title: config.title,
            description: config.body,
          })
        })
      } else {
        toast({ title: 'Fatura criada' })
        announce('Fatura criada')
      }
      onOpenChange(false)
      setFile(null)
      setAmount(0)
      onSaved?.()
    } catch (err) {
      const code = detectErrorCode(err)
      const config = getErrorConfig(code)
      toast({
        variant: 'destructive',
        title: config.title,
        description: config.body,
      })
      announce('Erro: ' + config.body, 'assertive')
    } finally {
      setSaving(false)
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Nova Fatura</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 space-y-2">
            <div>
              <Label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                A qual mês corresponde esta fatura?
              </Label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Isso define a data das transações geradas
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mês
                </Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="bg-white dark:bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Ano
                </Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="bg-white dark:bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">Valor total</Label>
            <CurrencyInput value={amount} onChange={setAmount} error={errors.total_amount} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700">
              Arquivo da fatura (opcional)
            </Label>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFile(e.dataTransfer.files?.[0])
              }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mt-1',
                dragOver ? 'border-[#22C55E] bg-emerald-50' : 'border-gray-300 bg-gray-50',
              )}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-gray-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, JPG ou PNG (máx. 10MB)</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          </div>
          {file && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Importar com IA</span>
              <Switch checked={useAI} onCheckedChange={setUseAI} />
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || amount <= 0}
            className="w-full bg-[#166534] hover:bg-[#15803D]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
