routerAdd(
  'POST',
  '/backend/v1/delete-invoice',
  (e) => {
    var body = e.requestInfo().body || {}
    var invoiceId = body.invoice_id
    if (!invoiceId) return e.badRequestError('invoice_id is required')

    try {
      $app.findRecordById('invoices', invoiceId)
    } catch (_) {
      return e.json(404, { error: 'not_found' })
    }

    var deletedItems = 0
    var deletedTransactions = 0

    try {
      $app.runInTransaction(function (txApp) {
        var items = txApp.findRecordsByFilter(
          'invoice_items',
          "invoice_id = '" + invoiceId + "'",
          '',
          500,
          0,
        )

        for (var i = 0; i < items.length; i++) {
          var itemId = items[i].getId()
          try {
            var txs = txApp.findRecordsByFilter(
              'transactions',
              "source = 'invoice_import' && invoice_item_id = '" + itemId + "'",
              '',
              500,
              0,
            )
            for (var t = 0; t < txs.length; t++) {
              txApp.delete(txs[t])
              deletedTransactions++
            }
          } catch (_) {}
        }

        for (var j = 0; j < items.length; j++) {
          txApp.delete(items[j])
          deletedItems++
        }

        var invoice = txApp.findRecordById('invoices', invoiceId)
        txApp.delete(invoice)
      })
    } catch (err) {
      return e.json(500, { error: 'delete_failed' })
    }

    return e.json(200, {
      success: true,
      deleted_items: deletedItems,
      deleted_transactions: deletedTransactions,
    })
  },
  $apis.requireAuth(),
)
