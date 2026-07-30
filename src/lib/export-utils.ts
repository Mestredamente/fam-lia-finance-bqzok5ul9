import { formatBRL, getMonthName } from '@/lib/utils'
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

export function exportToPDF(transactions: TransactionRecord[], month: number, year: number) {
  const receitas = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const despesas = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const saldo = receitas - despesas
  const rows = transactions
    .map(
      (t) => `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${new Date(t.transaction_date).toLocaleDateString('pt-BR')}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${t.description}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${t.expand?.category_id?.name || 'Sem categoria'}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${typeLabels[t.type] || t.type}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${formatBRL(t.amount)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${t.is_shared ? 'Sim' : 'Não'}</td>
    </tr>`,
    )
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Financeiro</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{color:#166534}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th{background:#F0FDF4;padding:8px;text-align:left;border-bottom:2px solid #166534}.summary{display:flex;gap:16px;margin:16px 0}.summary div{padding:12px;border-radius:8px;flex:1;font-size:14px}.receita{background:#F0FDF4;color:#166534}.despesa{background:#FEF2F2;color:#DC2626}.saldo{background:#EFF6FF;color:#1D4ED8}</style>
  </head><body>
  <h1>Relatório Financeiro</h1>
  <p>Período: ${getMonthName(month)} ${year}</p>
  <div class="summary">
    <div class="receita"><strong>Receitas:</strong> ${formatBRL(receitas)}</div>
    <div class="despesa"><strong>Despesas:</strong> ${formatBRL(despesas)}</div>
    <div class="saldo"><strong>Saldo:</strong> ${formatBRL(saldo)}</div>
  </div>
  <table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Compart.</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
  </body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
