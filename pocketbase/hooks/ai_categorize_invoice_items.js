routerAdd(
  'POST',
  '/backend/v1/ai-categorize-invoice-items',
  (e) => {
    var body = e.requestInfo().body || {}
    var invoiceId = body.invoice_id
    if (!invoiceId) return e.badRequestError('invoice_id is required')

    var categorizedByRules = 0
    var categorizedByAI = 0
    var noMatch = 0
    var aiError = null
    var aiBatchesTotal = 0
    var aiBatchesSuccess = 0
    var aiBatchesFailed = 0
    var step = null
    var unmatchedSamples = []

    try {
      var invoice = $app.findRecordById('invoices', invoiceId)
      var familyId = invoice.getString('family_id')

      $app
        .logger()
        .info('AI_CATEGORIZE: iniciando para fatura', 'invoiceId', invoiceId, 'familyId', familyId)

      var allItems = $app.findRecordsByFilter(
        'invoice_items',
        'invoice_id = "' + invoiceId + '"',
        'created',
        500,
        0,
      )

      var uncategorizedItems = []
      for (var i = 0; i < allItems.length; i++) {
        var isExcluded = allItems[i].get('excluded')
        if (isExcluded === true) continue
        var converted = allItems[i].getString('converted_transaction_id')
        if (converted) continue
        var existingSuggested = allItems[i].getString('suggested_category_id')
        var existingConfirmed = allItems[i].getString('confirmed_category_id')
        if (!existingSuggested && !existingConfirmed) {
          uncategorizedItems.push(allItems[i])
        }
      }

      if (uncategorizedItems.length === 0) {
        $app.logger().info('AI_CATEGORIZE: nenhum item sem categoria')
        return e.json(200, {
          success: true,
          categorized_by_rules: 0,
          categorized_by_ai: 0,
          no_match: 0,
          ai_error: null,
          ai_batches_total: 0,
          ai_batches_success: 0,
          ai_batches_failed: 0,
          step: null,
          unmatched_samples: [],
        })
      }

      var rules = []
      try {
        rules = $app.findRecordsByFilter(
          'categorization_rules',
          'family_id = "' + familyId + '"',
          'created',
          500,
          0,
        )
      } catch (err) {
        $app.logger().error('AI_CATEGORIZE: erro ao buscar regras', 'error', String(err))
      }

      var itemsNeedingAI = []
      for (var i = 0; i < uncategorizedItems.length; i++) {
        var item = uncategorizedItems[i]
        var description = item.getString('description')
        var lowerDesc = description.toLowerCase()
        var bestMatch = null
        var bestKeywordLen = 0

        for (var j = 0; j < rules.length; j++) {
          var keyword = rules[j].getString('keyword').toLowerCase()
          var matchType = rules[j].getString('match_type')
          var categoryId = rules[j].getString('category_id')

          var isMatch = false
          if (matchType === 'contains') {
            isMatch = lowerDesc.indexOf(keyword) !== -1
          } else if (matchType === 'starts_with') {
            isMatch = lowerDesc.indexOf(keyword) === 0
          }

          if (isMatch && keyword.length > bestKeywordLen) {
            bestMatch = categoryId
            bestKeywordLen = keyword.length
          }
        }

        if (bestMatch) {
          try {
            var record = $app.findRecordById('invoice_items', item.id)
            record.set('suggested_category_id', bestMatch)
            $app.save(record)
            categorizedByRules++
          } catch (err) {
            $app
              .logger()
              .error(
                'AI_CATEGORIZE: erro ao salvar item categorizado por regra',
                'itemId',
                item.id,
                'error',
                String(err),
              )
            itemsNeedingAI.push(item)
          }
        } else {
          itemsNeedingAI.push(item)
        }
      }

      $app
        .logger()
        .info(
          'AI_CATEGORIZE: regras aplicadas',
          'categorized_by_rules',
          categorizedByRules,
          'needing_ai',
          itemsNeedingAI.length,
        )

      var aiCategorizedIds = {}

      if (itemsNeedingAI.length > 0) {
        var categories = []
        try {
          categories = $app.findRecordsByFilter(
            'categories',
            'family_id = "' + familyId + '"',
            'created',
            500,
            0,
          )
        } catch (err) {
          $app.logger().error('AI_CATEGORIZE: erro ao buscar categorias', 'error', String(err))
        }

        if (categories.length > 0) {
          var categoryList = []
          for (var c = 0; c < categories.length; c++) {
            categoryList.push({
              id: categories[c].id,
              name: categories[c].getString('name'),
              type: categories[c].getString('type'),
            })
          }

          var batchSize = 20
          var batches = []
          for (var i = 0; i < itemsNeedingAI.length; i += batchSize) {
            batches.push(itemsNeedingAI.slice(i, i + batchSize))
          }
          aiBatchesTotal = batches.length

          for (var b = 0; b < batches.length; b++) {
            var batch = batches[b]
            $app
              .logger()
              .info(
                'AI_CATEGORIZE: processando lote ' +
                  (b + 1) +
                  ' de ' +
                  batches.length +
                  ' (' +
                  batch.length +
                  ' itens)',
              )

            try {
              var itemsList = []
              for (var k = 0; k < batch.length; k++) {
                itemsList.push(batch[k].getString('description'))
              }

              var prompt =
                'Para cada item abaixo, retorne apenas o ID da categoria mais adequada. Itens: ' +
                JSON.stringify(itemsList) +
                '. Categorias disponiveis: ' +
                JSON.stringify(categoryList) +
                '. Responda em JSON: [{"item_index": 0, "category_id": "xxx"}]'

              var reply = $ai.chat({
                model: 'fast',
                messages: [
                  {
                    role: 'system',
                    content:
                      'Voce e um assistente de categorizacao financeira. Responda apenas com JSON valido, sem texto adicional.',
                  },
                  { role: 'user', content: prompt },
                ],
              })

              var content = reply.choices[0].message.content
              var jsonStr = content
              var jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
              if (jsonMatch) {
                jsonStr = jsonMatch[0]
              }

              var aiResults = JSON.parse(jsonStr)

              for (var r = 0; r < aiResults.length; r++) {
                var itemIndex = aiResults[r].item_index
                var catId = aiResults[r].category_id
                if (itemIndex >= 0 && itemIndex < batch.length && catId) {
                  try {
                    var itemRecord = $app.findRecordById('invoice_items', batch[itemIndex].id)
                    itemRecord.set('suggested_category_id', catId)
                    $app.save(itemRecord)
                    aiCategorizedIds[batch[itemIndex].id] = true
                    categorizedByAI++
                  } catch (err) {
                    $app
                      .logger()
                      .error(
                        'AI_CATEGORIZE: erro ao salvar item categorizado por IA',
                        'itemId',
                        batch[itemIndex].id,
                        'error',
                        String(err),
                      )
                  }
                }
              }

              aiBatchesSuccess++
              $app.logger().info('AI_CATEGORIZE: lote ' + (b + 1) + ' concluido com sucesso')
            } catch (err) {
              aiBatchesFailed++
              var batchErrorMsg = String(err.message || err)
              if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
                batchErrorMsg = 'IA nao configurada'
              } else if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
                batchErrorMsg = String(err.message || err)
              }
              var batchError = 'lote ' + (b + 1) + ' falhou: ' + batchErrorMsg
              if (!aiError) {
                aiError = batchError
              }
              step = 'ai_categorization'
              $app.logger().error('AI_CATEGORIZE: ' + batchError, 'error', String(err))
            }
          }
        } else {
          $app
            .logger()
            .info('AI_CATEGORIZE: nenhuma categoria encontrada para a familia, pulando IA')
        }
      }

      for (var i = 0; i < itemsNeedingAI.length; i++) {
        if (!aiCategorizedIds[itemsNeedingAI[i].id]) {
          noMatch++
          if (unmatchedSamples.length < 5) {
            unmatchedSamples.push(itemsNeedingAI[i].getString('description'))
          }
        }
      }

      $app
        .logger()
        .info(
          'AI_CATEGORIZE: concluido',
          'categorized_by_rules',
          categorizedByRules,
          'categorized_by_ai',
          categorizedByAI,
          'no_match',
          noMatch,
          'batches_total',
          aiBatchesTotal,
          'batches_success',
          aiBatchesSuccess,
          'batches_failed',
          aiBatchesFailed,
        )

      return e.json(200, {
        success: true,
        categorized_by_rules: categorizedByRules,
        categorized_by_ai: categorizedByAI,
        no_match: noMatch,
        ai_error: aiError,
        ai_batches_total: aiBatchesTotal,
        ai_batches_success: aiBatchesSuccess,
        ai_batches_failed: aiBatchesFailed,
        step: step,
        unmatched_samples: unmatchedSamples,
      })
    } catch (err) {
      $app.logger().error('AI_CATEGORIZE: erro geral', 'error', String(err))
      return e.json(200, {
        success: false,
        categorized_by_rules: categorizedByRules,
        categorized_by_ai: categorizedByAI,
        no_match: noMatch,
        ai_error: String(err),
        ai_batches_total: aiBatchesTotal,
        ai_batches_success: aiBatchesSuccess,
        ai_batches_failed: aiBatchesFailed,
        step: 'general',
        unmatched_samples: unmatchedSamples,
      })
    }
  },
  $apis.requireAuth(),
)
