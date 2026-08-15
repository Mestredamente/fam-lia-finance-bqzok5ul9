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
      // 1. Buscar todos os invoice_items da invoice
      var items = $app.findRecordsByFilter(
        'invoice_items',
        'invoice_id = "' + invoiceId + '"',
        'created',
        500,
        0,
      )

      // 2. Buscar todas as transactions com invoice_item_id apontando para os invoice_items
      var transactions = []
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
            transactions.push(txs[t])
          }
        } catch (_) {}
      }

      // 3. Deletar cada transaction diretamente via DAO (bypassa onRecordDeleteRequest)
      for (var ti = 0; ti < transactions.length; ti++) {
        var tx = transactions[ti]
        try {
          $app.logger().info('DELETE_INVOICE: deletando transaction id=' + tx.id)
          $app.dao().deleteRecord(tx)
          deletedTransactions++
        } catch (txErr) {
          skipped++
          errors.push({
            transaction_id: tx.id,
            error: String(txErr.message || txErr),
          })
          $app
            .logger()
            .warn('DELETE_INVOICE: skipped transaction', 'tx_id', tx.id, 'error', String(txErr))
        }
      }
      $app.logger().info('DELETE_INVOICE: ' + deletedTransactions + ' transactions deletadas')

      // 4. Deletar cada invoice_item diretamente via DAO
      for (var j = 0; j < items.length; j++) {
        var item = items[j]
        try {
          $app.logger().info('DELETE_INVOICE: deletando invoice_item id=' + item.id)
          $app.dao().deleteRecord(item)
          deletedItems++
        } catch (itemErr) {
          skipped++
          errors.push({
            item_id: item.id,
            error: String(itemErr.message || itemErr),
          })
          $app
            .logger()
            .warn(
              'DELETE_INVOICE: failed to delete item',
              'item_id',
              item.id,
              'error',
              String(itemErr),
            )
        }
      }
      $app.logger().info('DELETE_INVOICE: ' + deletedItems + ' invoice_items deletados')

      // 5. Por fim, deletar a propria invoice diretamente via DAO
      var invoice = $app.findRecordById('invoices', invoiceId)
      $app.logger().info('DELETE_INVOICE: deletando invoice id=' + invoice.id)
      $app.dao().deleteRecord(invoice)
      $app.logger().info('DELETE_INVOICE: invoice deletada com sucesso')
    } catch (err) {
      $app.logger().error('DELETE_INVOICE: erro = ' + String(err))
      $app.logger().error('DELETE_INVOICE: stack = ' + String(err.stack || ''))
      return e.json(500, {
        error: String(err.message || err),
        stack: String(err.stack || ''),
        deleted: {
          transactions: deletedTransactions,
          invoice_items: deletedItems,
        },
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
        'deleted_transactions',
        String(deletedTransactions),
        'deleted_items',
        String(deletedItems),
        'skipped',
        String(skipped),
      )

    return e.json(200, {
      success: true,
      deleted: {
        transactions: deletedTransactions,
        invoice_items: deletedItems,
      },
      skipped: skipped,
      errors: errors,
    })
  },
  $apis.requireAuth(),
)
