import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, CheckCircle2, Loader2, Bug, Clock, FileText } from 'lucide-react'
import {
  runParseInvoiceDiagnostic,
  getInvoicesWithFiles,
  getFamilyIdForUser,
  type DiagnosticResult,
} from '@/services/diagnostics'
import type { InvoiceRecord } from '@/types/finance'

export default function DiagnosticInvoice() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadInvoices = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const familyId = await getFamilyIdForUser(user.id)
      if (!familyId) {
        setError('Família não encontrada')
        return
      }
      const data = await getInvoicesWithFiles(familyId)
      setInvoices(data)
    } catch {
      setError('Erro ao carregar faturas')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const runDiagnostic = async () => {
    if (!selectedId) return
    setRunning(true)
    setResult(null)
    try {
      const res = await runParseInvoiceDiagnostic(selectedId)
      setResult(res)
    } catch (err) {
      setResult({
        status: 0,
        statusText: 'Network Error',
        body: { error: String(err) },
        rawText: String(err),
        durationMs: 0,
      })
    } finally {
      setRunning(false)
    }
  }

  const isSuccess = result?.status === 200
  const bodyObj = result?.body as Record<string, unknown> | string | undefined
  const diagnostics =
    typeof bodyObj === 'object' && bodyObj
      ? ((bodyObj as Record<string, unknown>).diagnostics as
          | { url?: string; model?: string; logs?: string[] }
          | undefined)
      : undefined

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Bug className="w-6 h-6 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de Parse de Fatura</h1>
          <p className="text-sm text-muted-foreground">
            Executa a chamada real ao hook parse-invoice e captura todos os dados brutos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Fatura</CardTitle>
          <CardDescription>
            Escolha uma fatura com arquivo anexado para testar o parse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando faturas...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma fatura com arquivo encontrada. Crie uma fatura com arquivo na página de
              Cartões.
            </div>
          ) : (
            <>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fatura" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.expand?.card_id?.name || 'Cartão'} —{' '}
                      {new Date(inv.month_ref).toLocaleDateString('pt-BR')} ({inv.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={runDiagnostic}
                disabled={!selectedId || running}
                className="w-full sm:w-auto"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executando...
                  </>
                ) : (
                  'Executar Diagnóstico'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              Resultado da Execução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={isSuccess ? 'default' : 'destructive'}
                className="text-base px-3 py-1"
              >
                HTTP {result.status}
              </Badge>
              <span className="text-sm text-muted-foreground">{result.statusText}</span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" /> {(result.durationMs / 1000).toFixed(1)}s
              </div>
            </div>

            {diagnostics && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Diagnóstico do Hook
                </h3>
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm font-mono">
                  {diagnostics.url && (
                    <div>
                      <span className="text-muted-foreground">URL:</span> {diagnostics.url}
                    </div>
                  )}
                  {diagnostics.model && (
                    <div>
                      <span className="text-muted-foreground">Modelo:</span> {diagnostics.model}
                    </div>
                  )}
                </div>
                {diagnostics.logs && diagnostics.logs.length > 0 && (
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      LOGS BRUTOS:
                    </div>
                    <ScrollArea className="h-40">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {diagnostics.logs.join('\n')}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Outcome</h3>
              {isSuccess && typeof bodyObj === 'object' && bodyObj ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 space-y-1 text-sm">
                  <div>
                    <span className="font-semibold">Items extraídos:</span>{' '}
                    {String((bodyObj as Record<string, unknown>).items_count)}
                  </div>
                  <div>
                    <span className="font-semibold">Total:</span> R${' '}
                    {Number((bodyObj as Record<string, unknown>).total).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-semibold">Confiança:</span>{' '}
                    {String((bodyObj as Record<string, unknown>).confidence)}
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 space-y-2 text-sm">
                  {typeof bodyObj === 'object' && bodyObj && (
                    <div>
                      <span className="font-semibold">Erro:</span>{' '}
                      {String((bodyObj as Record<string, unknown>).error)}
                    </div>
                  )}
                  {typeof bodyObj === 'object' &&
                    bodyObj &&
                    (bodyObj as Record<string, unknown>).raw_error && (
                      <div>
                        <div className="font-semibold text-red-600 dark:text-red-400">
                          Raw Error (Gemini):
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap mt-1 max-h-40 overflow-auto">
                          {String((bodyObj as Record<string, unknown>).raw_error)}
                        </pre>
                      </div>
                    )}
                  {typeof bodyObj === 'object' &&
                    bodyObj &&
                    (bodyObj as Record<string, unknown>).raw_gemini_response && (
                      <div>
                        <div className="font-semibold text-red-600 dark:text-red-400">
                          Raw Gemini Response:
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap mt-1 max-h-40 overflow-auto">
                          {String((bodyObj as Record<string, unknown>).raw_gemini_response)}
                        </pre>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Resposta Completa (Raw JSON)</h3>
              <ScrollArea className="h-60">
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted rounded-lg p-3">
                  {result.rawText}
                </pre>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
