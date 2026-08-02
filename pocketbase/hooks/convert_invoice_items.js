routerAdd(
  'POST',
  '/backend/v1/convert-invoice-items',
  (e) => {
    var body = e.requestInfo().body || {}
    var invoiceId = body.invoice_id || ''
    var itemIds = body.invoice_item_ids || []
    if (!invoiceId) return e.badRequestError('ID da fatura é obrigatório')
    if (!Array.isArray(itemIds) || itemIds.length === 0)
      return e.badRequestError('Nenhum item fornecido')

    var invoice = null
    try {
      invoice = $app.findRecordById('invoices', invoiceId)
    } catch (_) {
      return e.badRequestError('Fatura não encontrada')
    }

    var cardId = invoice.getString('card_id')
    var familyId = invoice.getString('family_id')
    var card = null
    try {
      card = $app.findRecordById('credit_cards', cardId)
    } catch (_) {
      return e.badRequestError('Cartão não encontrado')
    }
    var ownerId = card.getString('owner_id')

    var txCol = $app.findCollectionByNameOrId('transactions')
    var count = 0

    for (var i = 0; i < itemIds.length; i++) {
      var item = null
      try {
        item = $app.findRecordById('invoice_items', itemIds[i])
      } catch (_) {
        continue
      }
      if (!item.get('is_confirmed')) continue

      var catId = item.getString('confirmed_category_id') || item.getString('suggested_category_id')
      if (!catId) continue

      var tx = new Record(txCol)
      tx.set('family_id', familyId)
      tx.set('owner_id', ownerId)
      tx.set('category_id', catId)
      tx.set('type', 'expense')
      tx.set('amount', item.get('amount'))
      tx.set('description', item.getString('description'))
      var txDate = item.getString('transaction_date')
      if (!txDate) txDate = invoice.getString('month_ref')
      tx.set('transaction_date', txDate)
      tx.set('is_shared', false)
      tx.set('is_fixed', false)
      tx.set('source', 'invoice_import')
      tx.set('invoice_item_id', item.getId())
      $app.save(tx)

      item.set('converted_transaction_id', tx.getId())
      item.set('is_confirmed', true)
      $app.save(item)
      count++
    }

    invoice.set('status', 'reviewed')
    $app.save(invoice)

    return e.json(200, { success: true, count: count })
  },
  $apis.requireAuth(),
)
