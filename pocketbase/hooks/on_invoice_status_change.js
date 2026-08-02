onRecordAfterUpdateSuccess((e) => {
  var newStatus = e.record.getString('status')
  var oldStatus = e.record.original().getString('status')

  if (newStatus !== 'paid' || oldStatus === 'paid') {
    return e.next()
  }

  var invoiceId = e.record.id
  $app
    .logger()
    .info('INVOICE_PAID: propagating paid status to linked transactions', 'invoice_id', invoiceId)

  try {
    var items = $app.findRecordsByFilter(
      'invoice_items',
      'invoice_id = "' + invoiceId + '"',
      'created',
      500,
      0,
    )

    var updated = 0
    for (var i = 0; i < items.length; i++) {
      var txId = items[i].getString('converted_transaction_id')
      if (txId) {
        try {
          var tx = $app.findRecordById('transactions', txId)
          tx.set('status', 'paid')
          $app.save(tx)
          updated++
        } catch (txErr) {
          $app
            .logger()
            .error(
              'INVOICE_PAID: failed to update transaction status',
              'tx_id',
              txId,
              'error',
              String(txErr),
            )
        }
      }
    }

    $app
      .logger()
      .info(
        'INVOICE_PAID: propagation complete',
        'invoice_id',
        invoiceId,
        'transactions_updated',
        String(updated),
      )
  } catch (err) {
    $app
      .logger()
      .error(
        'INVOICE_PAID: error finding invoice items',
        'invoice_id',
        invoiceId,
        'error',
        String(err),
      )
  }

  return e.next()
}, 'invoices')
