// Validação preventiva: rejeita transações com transaction_date cujo ano seja
// anterior a 2000 (ex.: datas corrompidas como 0002-11-30). Roda antes do create
// e do update da coleção `transactions`. Não toca no hook generate_recurring_transactions.
onRecordCreateRequest((e) => {
  var dateStr = e.record.getString('transaction_date')
  if (!dateStr) {
    return e.next()
  }
  var parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) {
    return e.badRequestError('Data de transação inválida. O ano deve ser posterior a 2000.')
  }
  if (parsed.getFullYear() < 2000) {
    return e.badRequestError('Data de transação inválida. O ano deve ser posterior a 2000.')
  }
  return e.next()
}, 'transactions')

onRecordUpdateRequest((e) => {
  var dateStr = e.record.getString('transaction_date')
  if (!dateStr) {
    return e.next()
  }
  var parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) {
    return e.badRequestError('Data de transação inválida. O ano deve ser posterior a 2000.')
  }
  if (parsed.getFullYear() < 2000) {
    return e.badRequestError('Data de transação inválida. O ano deve ser posterior a 2000.')
  }
  return e.next()
}, 'transactions')
