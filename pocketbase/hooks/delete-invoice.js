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
    var skipped = 0
    var errors = []

    try {
      var items = $app.findRecordsByFilter(
        'invoice_items',
        'invoice_id = "' + invoiceId + '"',
        'created',
        500,
        0,
      )

      for (var i = 0; i < items.length; i++) {
        var itemId = items[i].id
        try {
          var txs = $app.findRecordsByFilter(
            'transactions',
            "source = 'invoice_import' && invoice_item_id = '" + itemId + "'",
            '',
            500,
            0,
          )
          for (var t = 0; t < txs.length; t++) {
            try {
              $app.delete(txs[t])
              deletedTransactions++
            } catch (txErr) {
              skipped++
              errors.push({
                item_id: itemId,
                transaction_id: txs[t].id,
                error: String(txErr.message || txErr),
              })
              $app
                .logger()
                .warn(
                  'DELETE_INVOICE: skipped transaction',
                  'tx_id',
                  txs[t].id,
                  'item_id',
                  itemId,
                  'error',
                  String(txErr),
                )
            }
          }
        } catch (_) {}
      }

      for (var j = 0; j < items.length; j++) {
        try {
          $app.delete(items[j])
          deletedItems++
        } catch (itemErr) {
          $app
            .logger()
            .warn(
              'DELETE_INVOICE: failed to delete item',
              'item_id',
              items[j].id,
              'error',
              String(itemErr),
            )
        }
      }

      var invoice = $app.findRecordById('invoices', invoiceId)
      $app.delete(invoice)
    } catch (err) {
      $app.logger().error('DELETE_INVOICE: erro = ' + String(err))
      $app.logger().error('DELETE_INVOICE: stack = ' + String(err.stack || ''))
      return e.json(500, {
        error: String(err.message || err),
        stack: String(err.stack || ''),
        deleted_items: deletedItems,
        deleted_transactions: deletedTransactions,
        skipped: skipped,
        errors: errors,
      })
    }

    $app
      .logger()
      .info(
        'DELETE_INVOICE: success',
        'invoice_id',
        invoiceId,
        'deleted_items',
        String(deletedItems),
        'deleted_transactions',
        String(deletedTransactions),
        'skipped',
        String(skipped),
      )

    return e.json(200, {
      success: true,
      deleted_items: deletedItems,
      deleted_transactions: deletedTransactions,
      skipped: skipped,
      errors: errors,
    })
  },
  $apis.requireAuth(),
)
