routerAdd(
  'POST',
  '/backend/v1/convert-invoice-items',
  (e) => {
    var failedItemId = ''
    var totalItems = 0

    try {
      var body = e.requestInfo().body || {}
      var invoiceId = body.invoice_id || ''
      var itemIds = body.invoice_item_ids || []
      if (!invoiceId) return e.badRequestError('ID da fatura é obrigatório')
      if (!Array.isArray(itemIds) || itemIds.length === 0)
        return e.badRequestError('Nenhum item fornecido')

      totalItems = itemIds.length

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

      if (!familyId) throw new Error('family_id is missing from invoice record')

      var invoiceMonthRef = invoice.getString('month_ref') || ''
      if (invoiceMonthRef.length > 10) invoiceMonthRef = invoiceMonthRef.substring(0, 10)
      var txDate = invoiceMonthRef.substring(0, 7) + '-01'

      $app
        .logger()
        .info(
          'CONVERT_INVOICE_ITEMS: using invoice month_ref as transaction_date',
          'month_ref',
          txDate,
          'invoice_id',
          invoiceId,
        )

      var txCol = $app.findCollectionByNameOrId('transactions')
      var count = 0
      var errors = []

      for (var j = 0; j < itemIds.length; j++) {
        var itemId = itemIds[j]
        failedItemId = itemId

        var item = null
        try {
          item = $app.findRecordById('invoice_items', itemId)
        } catch (findErr) {
          errors.push({ item_id: itemId, description: '', error: 'Item não encontrado', index: j })
          continue
        }

        if (item.getString('converted_transaction_id')) {
          continue
        }

        if (item.get('excluded')) {
          continue
        }

        var catId =
          item.getString('confirmed_category_id') || item.getString('suggested_category_id') || ''

        var amount = item.get('amount')
        if (typeof amount === 'string') {
          amount = parseFloat(amount)
        }
        if (typeof amount !== 'number' || isNaN(amount)) {
          errors.push({
            item_id: itemId,
            description: item.getString('description') || '',
            error: 'Valor inválido (esperado número): ' + String(item.get('amount')),
            index: j,
          })
          continue
        }

        if (amount < 0) {
          errors.push({
            item_id: itemId,
            description: item.getString('description') || '',
            error: 'Valor negativo não permitido: ' + String(amount),
            index: j,
          })
          continue
        }

        var description = item.getString('description') || ''
        if (!description) {
          errors.push({ item_id: itemId, description: '', error: 'Descrição ausente', index: j })
          continue
        }

        var purchaseDate = item.getString('transaction_date') || ''
        if (purchaseDate.length > 10) purchaseDate = purchaseDate.substring(0, 10)

        $app.logger().info('CONVERT: item ' + itemId + ' transaction_date = ' + txDate)

        var tx = new Record(txCol)
        tx.set('family_id', familyId)
        tx.set('owner_id', ownerId)
        if (catId) {
          tx.set('category_id', catId)
        }
        tx.set('type', 'expense')
        tx.set('amount', amount)
        tx.set('description', description)
        tx.set('transaction_date', txDate)
        if (purchaseDate) {
          tx.set('purchase_date', purchaseDate)
        }
        tx.set('is_shared', false)
        tx.set('is_fixed', false)
        tx.set('source', 'invoice_import')
        tx.set('invoice_item_id', itemId)
        tx.set('status', 'pending')

        try {
          $app.save(tx)
        } catch (saveErr) {
          $app
            .logger()
            .error(
              'CONVERT_INVOICE_ITEMS: failed to create transaction',
              'item_id',
              itemId,
              'error',
              String(saveErr),
            )
          errors.push({
            item_id: itemId,
            description: description,
            error: String(saveErr.message || saveErr),
            index: j,
          })
          continue
        }

        item.set('converted_transaction_id', tx.id)
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
              'CONVERT_INVOICE_ITEMS: failed to update item',
              'item_id',
              itemId,
              'error',
              String(itemSaveErr),
            )
        }
        count++
      }

      failedItemId = ''

      var allItems = $app.findRecordsByFilter(
        'invoice_items',
        'invoice_id = "' + invoiceId + '"',
        'created',
        500,
        0,
      )
      var allConverted = true
      for (var ai = 0; ai < allItems.length; ai++) {
        if (!allItems[ai].get('excluded') && !allItems[ai].getString('converted_transaction_id')) {
          allConverted = false
          break
        }
      }

      var currentStatus = invoice.getString('status')
      if (allConverted) {
        var reviewNow = new Date()
        invoice.set('reviewed_at', reviewNow.toISOString())
        if (currentStatus !== 'paid') {
          invoice.set('status', 'reviewed')
        }
        $app
          .logger()
          .info(
            'CONVERT_INVOICE_ITEMS: all items converted, status updated',
            'invoice_id',
            invoiceId,
            'previous_status',
            currentStatus,
            'new_status',
            currentStatus === 'paid' ? 'paid' : 'reviewed',
            'reviewed_at',
            reviewNow.toISOString(),
          )
      } else {
        $app
          .logger()
          .info(
            'CONVERT_INVOICE_ITEMS: not all items converted, keeping status',
            'invoice_id',
            invoiceId,
            'all_converted',
            String(allConverted),
          )
      }

      try {
        $app.save(invoice)
      } catch (invErr) {
        $app
          .logger()
          .error('CONVERT_INVOICE_ITEMS: failed to update invoice status', 'error', String(invErr))
      }

      $app
        .logger()
        .info(
          'CONVERT_INVOICE_ITEMS: completed successfully',
          'total_items',
          String(totalItems),
          'converted',
          String(count),
          'errors_count',
          String(errors.length),
        )

      return e.json(200, {
        success: errors.length === 0,
        count: count,
        failed: errors.length,
        errors: errors,
        total: totalItems,
        all_converted: allConverted,
      })
    } catch (err) {
      $app.logger().error('CONVERT_INVOICE_ITEMS: erro = ' + err.toString())
      $app
        .logger()
        .error(
          'CONVERT_INVOICE_ITEMS: failure context',
          'total_items',
          String(totalItems),
          'failed_item',
          failedItemId,
          'error',
          String(err),
          'stack',
          String(err.stack || ''),
        )
      return e.json(400, {
        message: String(err.message || err),
        error: String(err.message || err),
        stack: String(err.stack || ''),
        failed_item: failedItemId,
        failed_items: failedItemId ? [failedItemId] : [],
      })
    }
  },
  $apis.requireAuth(),
)
