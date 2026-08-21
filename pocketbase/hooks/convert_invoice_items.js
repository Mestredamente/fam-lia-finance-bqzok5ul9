routerAdd(
  'POST',
  '/backend/v1/convert-invoice-items',
  (e) => {
    var failedItemId = ''
    var totalItems = 0

    function fixMojibake(str) {
      if (!str || typeof str !== 'string') return str || ''
      if (
        /Ã[§£©ãÃáéíóúâêîôûàèìòùäëïöüãõñçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÃÕÑÇ\x80-\xbf]/.test(str) ||
        /[\u00c0-\u00c3][\u0080-\u00bf]/.test(str)
      ) {
        try {
          var fixed = decodeURIComponent(escape(str))
          if (fixed && fixed !== str) return fixed
        } catch (_) {}
      }
      return str
    }

    try {
      var body = e.requestInfo().body || {}
      var invoiceId = body.invoice_id || ''
      var itemIds = body.invoice_item_ids || []
      var itemEmotions = body.item_emotions || {}
      if (!invoiceId) return e.badRequestError('ID da fatura é obrigatório')
      if (!Array.isArray(itemIds) || itemIds.length === 0)
        return e.badRequestError('Nenhum item fornecido')

      var VALID_EMOTIONS = ['happy', 'necessary', 'regret', 'impulsive', 'neutral']

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
      var defaultMonthDate = ''
      if (invoiceMonthRef && invoiceMonthRef.length >= 7) {
        defaultMonthDate = invoiceMonthRef.substring(0, 7) + '-01'
      }

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

        var description = fixMojibake(item.getString('description') || '')
        if (!description) {
          errors.push({ item_id: itemId, description: '', error: 'Descrição ausente', index: j })
          continue
        }

        var purchaseDate = item.getString('transaction_date') || ''
        if (purchaseDate.length > 10) purchaseDate = purchaseDate.substring(0, 10)

        // Prioridade 1: item.transaction_date (data individual extraída da fatura)
        // Prioridade 2: invoice.month_ref (fallback do mês da fatura)
        // Se nenhuma data disponível: lançar erro e NÃO criar a transação (nunca usar new Date())
        var effectiveTxDate = ''
        if (purchaseDate) {
          effectiveTxDate = purchaseDate
        } else if (defaultMonthDate) {
          effectiveTxDate = defaultMonthDate
        }

        if (!effectiveTxDate) {
          errors.push({
            item_id: itemId,
            description: description,
            error: 'Nenhuma data disponível para a transação (nem no item nem no mês da fatura)',
            index: j,
          })
          continue
        }

        $app.logger().info('CONVERT: item ' + itemId + ' transaction_date = ' + effectiveTxDate)

        var tx = new Record(txCol)
        tx.set('family_id', familyId)
        tx.set('owner_id', ownerId)
        if (catId) {
          tx.set('category_id', catId)
        }
        tx.set('type', 'expense')
        tx.set('amount', amount)
        tx.set('description', description)
        tx.set('transaction_date', effectiveTxDate)
        if (purchaseDate) {
          tx.set('purchase_date', purchaseDate)
        }
        tx.set('is_shared', false)
        tx.set('is_fixed', false)
        tx.set('source', 'invoice_import')
        tx.set('invoice_item_id', itemId)
        tx.set('status', 'pending')

        var itemEmotion = itemEmotions[itemId] || ''
        if (itemEmotion && VALID_EMOTIONS.indexOf(itemEmotion) !== -1) {
          tx.set('emotion', itemEmotion)
          tx.set('emotion_note', '')
        } else {
          tx.set('emotion', '')
          tx.set('emotion_note', '')
        }

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

        var isInst = item.get('is_installment')
        if (isInst) {
          var instCurrent = item.get('installment_current') || 1
          var instTotal = item.get('installment_total') || 1
          var remaining = instTotal - instCurrent
          if (remaining > 0) {
            for (var fi2 = 1; fi2 <= remaining; fi2++) {
              var baseDate = new Date(effectiveTxDate + 'T00:00:00')
              baseDate.setMonth(baseDate.getMonth() + fi2)
              var fm = baseDate.getMonth() + 1
              var futureDateStr =
                baseDate.getFullYear() + '-' + (fm < 10 ? '0' + fm : '' + fm) + '-01'
              var futureDesc =
                description + ' (parcela ' + (instCurrent + fi2) + '/' + instTotal + ')'
              var futureTx = new Record(txCol)
              futureTx.set('family_id', familyId)
              futureTx.set('owner_id', ownerId)
              if (catId) {
                futureTx.set('category_id', catId)
              }
              futureTx.set('type', 'expense')
              futureTx.set('amount', amount)
              futureTx.set('description', futureDesc)
              futureTx.set('transaction_date', futureDateStr)
              futureTx.set('is_shared', false)
              futureTx.set('is_fixed', false)
              futureTx.set('source', 'future_installment')
              futureTx.set('is_installment', true)
              futureTx.set('installment_current', instCurrent + fi2)
              futureTx.set('installment_total', instTotal)
              futureTx.set('parent_transaction_id', tx.id)
              futureTx.set('status', 'pending')
              var parentEmotion = tx.getString('emotion')
              if (parentEmotion && VALID_EMOTIONS.indexOf(parentEmotion) !== -1) {
                futureTx.set('emotion', parentEmotion)
                futureTx.set('emotion_note', '')
              }
              try {
                $app.save(futureTx)
                $app
                  .logger()
                  .info(
                    'INSTALLMENT: criada transação futura - ' +
                      futureDesc +
                      ' para ' +
                      futureDateStr,
                  )
              } catch (futErr) {
                $app
                  .logger()
                  .error('INSTALLMENT: erro ao criar transação futura', 'error', String(futErr))
              }
            }
          }
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
