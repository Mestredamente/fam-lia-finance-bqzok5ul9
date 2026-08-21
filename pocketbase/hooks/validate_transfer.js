// Hook de validação para transações de transferência entre contas
onRecordCreateRequest((e) => {
  var t = e.record.getString('type')
  if (t === 'transfer') {
    var sourceAcc = e.record.getString('account_id')
    var destAcc = e.record.getString('transfer_to_account_id')
    if (!sourceAcc || !destAcc) {
      return e.badRequestError(
        'Transferências exigem conta de origem e conta de destino preenchidas.',
      )
    }
    if (sourceAcc === destAcc) {
      return e.badRequestError('A conta de origem e a conta de destino não podem ser iguais.')
    }
  }
  return e.next()
}, 'transactions')

onRecordUpdateRequest((e) => {
  var t = e.record.getString('type')
  if (t === 'transfer') {
    var sourceAcc = e.record.getString('account_id')
    var destAcc = e.record.getString('transfer_to_account_id')
    if (!sourceAcc || !destAcc) {
      return e.badRequestError(
        'Transferências exigem conta de origem e conta de destino preenchidas.',
      )
    }
    if (sourceAcc === destAcc) {
      return e.badRequestError('A conta de origem e a conta de destino não podem ser iguais.')
    }
  }
  return e.next()
}, 'transactions')
