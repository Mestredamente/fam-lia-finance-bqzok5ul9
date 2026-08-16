import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { exportToCSV } from '@/lib/export-utils'
import { generateDashboardPdf } from '@/components/DashboardPdfExport'
import { toast } from '@/hooks/use-toast'
import type { MemberRecord, TransactionRecord } from '@/types/finance'

interface Props {
  transactions: TransactionRecord[]
  month: number
  year: number
  familyName: string
  members: MemberRecord[]
  memberSummaries?: Record<string, { totalReceitas: number; totalDespesas: number; saldo: number }>
  futureInstallments?: TransactionRecord[]
}

export function ExportButton({
  transactions,
  month,
  year,
  familyName,
  members,
  memberSummaries,
  futureInstallments,
}: Props) {
  const [exporting, setExporting] = useState(false)

  const handleCSV = () => {
    exportToCSV(transactions, month, year)
  }

  const handlePDF = async () => {
    setExporting(true)
    try {
      // Generates the full multi-page PDF (pages 1–2 fall back to text-based
      // category list / emotional patterns when no capture container is passed,
      // and page 3+ — the transactions table — is always drawn from data).
      const ok = await generateDashboardPdf(
        {
          familyName,
          month,
          year,
          transactions,
          members,
          memberSummaries: memberSummaries ?? {},
          futureInstallments: futureInstallments ?? [],
        },
        null,
      )
      if (!ok) throw new Error('Falha ao gerar PDF')
      toast({ title: 'PDF gerado', description: 'O relatório foi baixado com sucesso.' })
    } catch {
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          disabled={exporting}
          className="h-9 px-3 py-2 rounded-lg text-sm bg-muted hover:bg-muted/80 text-foreground"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF} disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
