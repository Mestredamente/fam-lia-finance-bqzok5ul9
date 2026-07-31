import { formatBRL, getMonthName } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

const typeLabels: Record<string, string> = {
  expense: 'Despesa',
  income: 'Receita',
  investment: 'Investimento',
  debt_payment: 'Pagamento de Dívida',
}

export function generateMonthlyPDF(
  transactions: TransactionRecord[],
  month: number,
  year: number,
  prevIncome = 0,
  prevExpenses = 0,
) {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses

  const byCat: Record<string, { name: string; amount: number }> = {}
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const name = t.expand?.category_id?.name || 'Sem categoria'
    if (!byCat[name]) byCat[name] = { name, amount: 0 }
    byCat[name].amount += t.amount
  }
  const top5 = Object.values(byCat)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const incomeChange =
    prevIncome > 0 ? (((income - prevIncome) / prevIncome) * 100).toFixed(1) : null
  const expensesChange =
    prevExpenses > 0 ? (((expenses - prevExpenses) / prevExpenses) * 100).toFixed(1) : null

  const rows = transactions
    .map(
      (t) =>
        `<tr><td style="padding:4px 6px;border-bottom:1px solid #eee">${new Date(t.transaction_date).toLocaleDateString('pt-BR')}</td><td style="padding:4px 6px;border-bottom:1px solid #eee">${t.description}</td><td style="padding:4px 6px;border-bottom:1px solid #eee">${t.expand?.category_id?.name || 'Sem categoria'}</td><td style="padding:4px 6px;border-bottom:1px solid #eee">${typeLabels[t.type] || t.type}</td><td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right">${formatBRL(t.amount)}</td></tr>`,
    )
    .join('')

  const monthStr = String(month + 1).padStart(2, '0')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>relatorio-mensal-${monthStr}-${year}.pdf</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{color:#166534}.summary{display:flex;gap:12px;margin:16px 0}.summary div{padding:12px;border-radius:8px;flex:1;font-size:13px}.income{background:#F0FDF4;color:#166534}.expense{background:#FEF2F2;color:#DC2626}.balance{background:#EFF6FF;color:#1D4ED8}.mom{font-size:12px;color:#666;margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}th{background:#F0FDF4;padding:6px;text-align:left;border-bottom:2px solid #166534}.top-cat{margin:12px 0}.top-cat div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;font-size:12px}</style></head><body><h1>Relatório Financeiro</h1><p>Período: ${getMonthName(month)} ${year}</p><div class="summary"><div class="income"><strong>Receitas:</strong> ${formatBRL(income)}</div><div class="expense"><strong>Despesas:</strong> ${formatBRL(expenses)}</div><div class="balance"><strong>Saldo:</strong> ${formatBRL(balance)}</div></div>${incomeChange ? `<p class="mom">Receitas: ${incomeChange}% vs mês anterior</p>` : ''}${expensesChange ? `<p class="mom">Despesas: ${expensesChange}% vs mês anterior</p>` : ''}<div class="top-cat"><h3>Top 5 Categorias</h3>${top5.map((c) => `<div><span>${c.name}</span><span>${formatBRL(c.amount)}</span></div>`).join('')}</div><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
