import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToPDF } from '@/lib/export-utils'
import type { TransactionRecord } from '@/types/finance'

interface Props {
  transactions: TransactionRecord[]
  month: number
  year: number
}

export function ExportButton({ transactions, month, year }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleCSV = () => {
    exportToCSV(transactions, month, year)
  }

  const handlePDF = () => {
    setExporting(true)
    setTimeout(() => {
      exportToPDF(transactions, month, year)
      setExporting(false)
    }, 200)
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
        <DropdownMenuItem onClick={handlePDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
