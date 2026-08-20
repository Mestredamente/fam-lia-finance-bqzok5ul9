import { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, Loader2, Check, RefreshCw } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { parseDDC, type DDCParsedData } from '@/services/ddc'
import { formatBRL } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  onConfirm: (data: DDCParsedData) => void
}

type Step = 'upload' | 'processing' | 'preview' | 'error'

export function DDCImportSheet({ open, onOpenChange, familyId, onConfirm }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [parsedData, setParsedData] = useState<DDCParsedData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('upload')
    setParsedData(null)
    setErrorMessage('')
    setIsDragging(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Apenas arquivos PDF são aceitos.',
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'Arquivo muito grande. Máximo 10MB.',
      })
      return
    }

    setStep('processing')
    setErrorMessage('')

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const resultBase64 = reader.result as string
        const response = await parseDDC(resultBase64, familyId)

        if (response.success && response.data) {
          setParsedData(response.data)
          setStep('preview')
        } else {
          setErrorMessage(
            response.error || 'Não foi possível ler o DDC. Verifique se o arquivo é um DDC válido.',
          )
          setStep('error')
        }
      } catch (err: unknown) {
        let msg = 'Não foi possível ler o DDC. Verifique se o arquivo é um DDC válido.'
        const errStr = String(err)
        if (errStr.includes('TIMEOUT')) {
          msg = 'Tempo esgotado. O DDC pode ser muito extenso. Tente novamente.'
        } else if (errStr.includes('503') || errStr.includes('overload')) {
          msg = 'Sistema ocupado. Tente novamente.'
        } else if (err && typeof err === 'object' && 'message' in err) {
          const m = String((err as { message: unknown }).message)
          if (m && m !== 'TIMEOUT') msg = m
        }
        setErrorMessage(msg)
        setStep('error')
      }
    }

    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo selecionado. Tente novamente.')
      setStep('error')
    }

    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleConfirm = () => {
    if (parsedData) {
      onConfirm(parsedData)
      handleOpenChange(false)
    }
  }

  const formatDateDisplay = (isoDate: string | null | undefined) => {
    if (!isoDate) return 'Não identificado'
    try {
      const parts = isoDate.split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return isoDate
    } catch {
      return isoDate
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold text-gray-900">
            {step === 'preview' ? 'Confirme os dados extraídos do DDC' : 'Importar DDC (PDF)'}
          </SheetTitle>
        </SheetHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#166534] bg-emerald-50/50'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100/70'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-[#166534]">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Arraste o DDC aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Documento de Custos e Condições (PDF até 10MB)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs font-medium"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Selecionar arquivo
              </Button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-semibold">O que é o DDC?</p>
              <p className="text-blue-800 text-[11px]">
                O Documento de Custos e Condições (Resolução CMN 4.192/2013 do BACEN) é fornecido
                pelas instituições financeiras e contém todas as informações da operação (CET,
                juros, parcelas e saldo devedor).
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-[#166534]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">Extraindo dados do DDC...</h3>
              <p className="text-xs text-gray-500">
                Isso pode levar alguns segundos enquanto a IA analisa o documento.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            {/* Card âmbar de aviso */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Verifique os dados antes de confirmar. Você poderá editar qualquer campo depois.
              </span>
            </div>

            {/* Tabela / Card de resumo */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#166534]" />
                  Dados Extraídos do DDC
                </span>
                {parsedData.amortization_system && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {parsedData.amortization_system}
                  </span>
                )}
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Banco / Instituição:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {parsedData.bank_name || 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Valor da parcela:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {parsedData.installment_value != null
                      ? formatBRL(parsedData.installment_value)
                      : 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Total de parcelas:</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {parsedData.installments_total != null
                      ? `${parsedData.installments_total} meses`
                      : 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Sistema de amortização:</span>
                  <span className="font-semibold text-gray-900">
                    {parsedData.amortization_system || 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Taxa de juros mensal:</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {parsedData.interest_rate != null
                      ? `${parsedData.interest_rate}% a.m.`
                      : 'Não identificada'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">CET anual:</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {parsedData.cet != null ? `${parsedData.cet}% a.a.` : 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Valor financiado:</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {parsedData.financed_amount != null
                      ? formatBRL(parsedData.financed_amount)
                      : 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Saldo devedor para quitação:</span>
                  <span className="font-bold text-rose-700 font-mono">
                    {parsedData.balance_due != null
                      ? formatBRL(parsedData.balance_due)
                      : 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Dia de vencimento:</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {parsedData.due_day != null ? `Dia ${parsedData.due_day}` : 'Não identificado'}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex justify-between items-center">
                  <span className="text-gray-500">Primeiro vencimento:</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {formatDateDisplay(parsedData.first_due_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={handleConfirm}
                className="w-full h-11 bg-[#166534] hover:bg-[#15803D] font-semibold text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Confirmar e preencher
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="w-full h-10"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: ERROR */}
        {step === 'error' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-amber-950">Não foi possível processar o DDC</h3>
              <p className="text-xs text-amber-900">{errorMessage}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setStep('upload')
                  setErrorMessage('')
                }}
                className="w-full h-11 bg-[#166534] hover:bg-[#15803D] font-semibold text-white rounded-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="w-full h-10"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
