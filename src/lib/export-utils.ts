import { getMonthName } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

const typeLabels: Record<string, string> = {
  expense: 'Despesa',
  income: 'Receita',
  investment: 'Investimento',
  debt_payment: 'Pagamento de Dívida',
}

export function exportToCSV(transactions: TransactionRecord[], month: number, year: number) {
  const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Compartilhada']
  const rows = transactions.map((t) => [
    new Date(t.transaction_date).toLocaleDateString('pt-BR'),
    t.description,
    t.expand?.category_id?.name || 'Sem categoria',
    typeLabels[t.type] || t.type,
    t.amount.toFixed(2).replace('.', ','),
    t.is_shared ? 'Sim' : 'Não',
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_${getMonthName(month)}_${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
