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

      var txCol = $app.findCollectionByNameOrId('transactions')
      var count = 0
      var errors = []
      var batchSize = 10

      for (var batchStart = 0; batchStart < itemIds.length; batchStart += batchSize) {
        var batchEnd = Math.min(batchStart + batchSize, itemIds.length)
        var batchNum = Math.floor(batchStart / batchSize) + 1
        var totalBatches = Math.ceil(itemIds.length / batchSize)

        $app
          .logger()
          .info(
            'CONVERT_INVOICE_ITEMS: processing batch ' +
              batchNum +
              ' of ' +
              totalBatches +
              ', items ' +
              (batchStart + 1) +
              '-' +
              batchEnd +
              ' of ' +
              totalItems,
          )

        for (var j = batchStart; j < batchEnd; j++) {
          var itemId = itemIds[j]
          failedItemId = itemId

          var item = null
          try {
            item = $app.findRecordById('invoice_items', itemId)
          } catch (findErr) {
            $app
              .logger()
              .error(
                'CONVERT_INVOICE_ITEMS: item not found',
                'item_id',
                itemId,
                'error',
                String(findErr),
              )
            errors.push({
              item_id: itemId,
              description: '',
              error: 'Item não encontrado',
              index: j,
            })
            continue
          }

          if (item.getString('converted_transaction_id')) {
            $app
              .logger()
              .info('CONVERT_INVOICE_ITEMS: skipping already converted item', 'item_id', itemId)
            continue
          }

          if (item.get('excluded')) {
            $app.logger().info('CONVERT_INVOICE_ITEMS: skipping excluded item', 'item_id', itemId)
            continue
          }

          var catId =
            item.getString('confirmed_category_id') || item.getString('suggested_category_id') || ''

          $app.logger().info('CONVERT: item ' + itemId + ' category_id = ' + (catId || 'null'))

          var amount = item.get('amount')
          if (typeof amount === 'string') {
            amount = parseFloat(amount)
          }
          if (typeof amount !== 'number' || isNaN(amount)) {
            $app
              .logger()
              .error(
                'CONVERT_INVOICE_ITEMS: invalid amount type',
                'item_id',
                itemId,
                'amount_raw',
                String(item.get('amount')),
                'amount_type',
                typeof item.get('amount'),
              )
            errors.push({
              item_id: itemId,
              description: item.getString('description') || '',
              error: 'Valor inválido (esperado número): ' + String(item.get('amount')),
              index: j,
            })
            continue
          }

          if (amount < 0) {
            $app
              .logger()
              .warn(
                'CONVERT_INVOICE_ITEMS: negative amount filtered',
                'item_id',
                itemId,
                'amount',
                String(amount),
              )
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
            $app.logger().error('CONVERT_INVOICE_ITEMS: missing description', 'item_id', itemId)
            errors.push({ item_id: itemId, description: '', error: 'Descrição ausente', index: j })
            continue
          }

          var itemDateRaw = item.getString('transaction_date') || ''
          var invoiceMonthRef = invoice.getString('month_ref') || ''
          if (itemDateRaw.length > 10) itemDateRaw = itemDateRaw.substring(0, 10)
          if (invoiceMonthRef.length > 10) invoiceMonthRef = invoiceMonthRef.substring(0, 10)

          var nowDate = new Date()
          var todayStr =
            nowDate.getFullYear() +
            '-' +
            String(nowDate.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(nowDate.getDate()).padStart(2, '0')

          var txDate = ''

          if (itemDateRaw && itemDateRaw.trim() !== '') {
            if (itemDateRaw > todayStr) {
              $app
                .logger()
                .info(
                  'CONVERT: item ' +
                    itemId +
                    ' date is in the future (' +
                    itemDateRaw +
                    '), using invoice month_ref',
                )
              txDate = invoiceMonthRef
            } else {
              txDate = itemDateRaw

              var closingDay = card.get('closing_day') || 1
              var dueDay = card.get('due_day') || 10
              var refYear = parseInt(invoiceMonthRef.substring(0, 4), 10)
              var refMonth = parseInt(invoiceMonthRef.substring(5, 7), 10)
              var periodStart =
                refYear +
                '-' +
                String(refMonth).padStart(2, '0') +
                '-' +
                String(closingDay).padStart(2, '0')
              var periodEnd =
                refYear +
                '-' +
                String(refMonth).padStart(2, '0') +
                '-' +
                String(dueDay).padStart(2, '0')

              if (itemDateRaw < periodStart || itemDateRaw > periodEnd) {
                $app
                  .logger()
                  .warn(
                    'CONVERT: WARNING - data do item fora do período da fatura: ' + itemDateRaw,
                    'item_id',
                    itemId,
                  )
              }
            }
          } else {
            txDate = invoiceMonthRef
          }

          if (!txDate || txDate.trim() === '') {
            $app
              .logger()
              .error(
                'CONVERT_INVOICE_ITEMS: missing transaction_date after fallback',
                'item_id',
                itemId,
              )
            errors.push({
              item_id: itemId,
              description: description,
              error: 'Data da transação ausente',
              index: j,
            })
            continue
          }

          $app.logger().info('CONVERT: item ' + itemId + ' data = ' + txDate)

          $app
            .logger()
            .info(
              'CONVERT_INVOICE_ITEMS: creating transaction for item ' + itemId,
              'payload_description',
              description,
              'payload_amount',
              String(amount),
              'payload_transaction_date',
              txDate,
              'payload_category_id',
              catId || '(none)',
              'payload_family_id',
              familyId,
              'payload_type',
              'expense',
              'payload_owner_id',
              ownerId,
              'payload_invoice_item_id',
              itemId,
              'payload_source',
              'invoice_import',
            )

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
                'description',
                description,
                'amount',
                String(amount),
                'category_id',
                catId || '(none)',
                'family_id',
                familyId,
                'owner_id',
                ownerId,
                'invoice_id',
                invoiceId,
                'transaction_date',
                txDate,
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
      }

      failedItemId = ''

      invoice.set('status', 'reviewed')
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
