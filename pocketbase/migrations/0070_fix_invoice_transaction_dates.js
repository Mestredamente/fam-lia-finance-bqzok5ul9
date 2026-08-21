migrate(
  (app) => {
    var count = 0
    var transactions = []
    try {
      transactions = app.findRecordsByFilter(
        'transactions',
        'source = "invoice_import"',
        'created',
        5000,
        0,
      )
    } catch (err) {
      console.log('MIGRATION 0070: erro ao buscar transações de fatura: ' + String(err))
      return
    }

    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i]
      var invoiceItemId = tx.getString('invoice_item_id')
      if (!invoiceItemId) continue

      var item = null
      try {
        item = app.findRecordById('invoice_items', invoiceItemId)
      } catch (_) {
        continue
      }

      var itemTxDate = item.getString('transaction_date') || ''
      if (itemTxDate.length > 10) itemTxDate = itemTxDate.substring(0, 10)

      if (itemTxDate && itemTxDate !== tx.getString('transaction_date')) {
        tx.set('transaction_date', itemTxDate)
        try {
          app.save(tx)
          count++
        } catch (saveErr) {
          console.log('MIGRATION 0070: erro ao atualizar tx ' + tx.id + ': ' + String(saveErr))
        }
      }
    }

    console.log(
      'MIGRATION 0070: ' + count + ' transações de fatura corrigidas com a data real do item.',
    )
  },
  (app) => {
    // Rollback não-destrutivo: a correção de dados históricos é mantida
  },
)
