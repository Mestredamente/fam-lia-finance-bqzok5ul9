// Validação preventiva: garante que toda transação tenha type 'expense' ou
// 'income'. Investimentos e Dívidas foram unificados em Patrimônio, então tipos
// legados ('investment', 'debt_payment') não são mais aceitos no create/update.
// Roda antes do create e do update da coleção `transactions`.
onRecordCreateRequest((e) => {
  var t = e.record.getString('type')
  if (t !== 'expense' && t !== 'income' && t !== 'transfer') {
    return e.badRequestError(
      'Tipo de transação inválido. Use "Despesa", "Receita" ou "Transferência".',
    )
  }
  return e.next()
}, 'transactions')

onRecordUpdateRequest((e) => {
  var t = e.record.getString('type')
  if (t !== 'expense' && t !== 'income' && t !== 'transfer') {
    return e.badRequestError(
      'Tipo de transação inválido. Use "Despesa", "Receita" ou "Transferência".',
    )
  }
  return e.next()
}, 'transactions')
