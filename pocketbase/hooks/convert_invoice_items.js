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
    if (!ownerId) return e.badRequestError('Cartão não tem proprietário')

    var txCol = $app.findCollectionByNameOrId('transactions')
    var count = 0
    var errors = []

    for (var i = 0; i < itemIds.length; i++) {
      var item = null
      try {
        item = $app.findRecordById('invoice_items', itemIds[i])
      } catch (findErr) {
        $app
          .logger()
          .error(
            'convert-invoice-items: item not found',
            'item_id',
            itemIds[i],
            'error',
            String(findErr),
          )
        errors.push({ item_id: itemIds[i], error: 'Item não encontrado' })
        continue
      }

      if (item.getString('converted_transaction_id')) {
        $app
          .logger()
          .info('convert-invoice-items: skipping already converted item', 'item_id', itemIds[i])
        continue
      }

      var catId =
        item.getString('confirmed_category_id') || item.getString('suggested_category_id') || ''

      var tx = new Record(txCol)
      tx.set('family_id', familyId)
      tx.set('owner_id', ownerId)
      if (catId) {
        tx.set('category_id', catId)
      }
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

      try {
        if (catId) {
          $app.save(tx)
        } else {
          $app.saveNoValidate(tx)
        }
      } catch (saveErr) {
        $app
          .logger()
          .error(
            'convert-invoice-items: failed to create transaction',
            'item_id',
            itemIds[i],
            'error',
            String(saveErr),
            'description',
            item.getString('description'),
            'amount',
            item.get('amount'),
            'category_id',
            catId,
            'family_id',
            familyId,
            'owner_id',
            ownerId,
            'invoice_id',
            invoiceId,
          )
        errors.push({ item_id: itemIds[i], error: String(saveErr.message || saveErr) })
        continue
      }

      item.set('converted_transaction_id', tx.getId())
      item.set('is_confirmed', true)
      if (catId) {
        item.set('confirmed_category_id', catId)
      }
      try {
        $app.save(item)
      } catch (itemSaveErr) {
        $app
          .logger()
          .error(
            'convert-invoice-items: failed to update item',
            'item_id',
            itemIds[i],
            'error',
            String(itemSaveErr),
          )
      }
      count++
    }

    invoice.set('status', 'reviewed')
    try {
      $app.save(invoice)
    } catch (invErr) {
      $app
        .logger()
        .error('convert-invoice-items: failed to update invoice status', 'error', String(invErr))
    }

    return e.json(200, { success: true, count: count, errors: errors })
  },
  $apis.requireAuth(),
)
