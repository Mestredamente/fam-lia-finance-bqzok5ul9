routerAdd(
  'POST',
  '/backend/v1/ai-categorize-invoice-items',
  (e) => {
    var body = e.requestInfo().body || {}
    var invoiceId = body.invoice_id

    $app.logger().info('AI_CATEGORIZE: endpoint chamado, invoice_id = ' + invoiceId)
    $app.logger().info('AI_CATEGORIZE: body recebido = ' + JSON.stringify(body))

    if (!invoiceId) {
      return e.json(200, {
        success: false,
        categorized_by_rules: 0,
        categorized_by_ai: 0,
        no_match: 0,
        ai_error: 'invoice_id is required',
        step: 'validation',
      })
    }

    var invoice
    try {
      invoice = $app.findRecordById('invoices', invoiceId)
    } catch (err) {
      return e.json(200, {
        success: false,
        categorized_by_rules: 0,
        categorized_by_ai: 0,
        no_match: 0,
        ai_error: 'Invoice not found: ' + String(err),
        step: 'find_invoice',
      })
    }

    var familyId = invoice.getString('family_id')

    var allItems = []
    try {
      allItems = $app.findRecordsByFilter(
        'invoice_items',
        'invoice_id = "' + invoiceId + '"',
        'created',
        500,
        0,
      )
    } catch (err) {
      return e.json(200, {
        success: false,
        categorized_by_rules: 0,
        categorized_by_ai: 0,
        no_match: 0,
        ai_error: 'Failed to fetch invoice items: ' + String(err),
        step: 'fetch_invoice_items',
      })
    }

    var uncategorizedItems = []
    for (var i = 0; i < allItems.length; i++) {
      var excluded = allItems[i].getBool('excluded')
      var confirmed = allItems[i].getString('confirmed_category_id')
      var suggested = allItems[i].getString('suggested_category_id')
      var converted = allItems[i].getString('converted_transaction_id')
      if (!excluded && !confirmed && !suggested && !converted) {
        uncategorizedItems.push(allItems[i])
      }
    }

    $app
      .logger()
      .info('AI_CATEGORIZE: encontrou ' + uncategorizedItems.length + ' itens sem categoria')

    if (uncategorizedItems.length === 0) {
      $app.logger().info('AI_CATEGORIZE: fim - by_rules=0 by_ai=0 no_match=0')
      return e.json(200, {
        success: true,
        categorized_by_rules: 0,
        categorized_by_ai: 0,
        no_match: 0,
        ai_error: null,
        step: null,
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
      $app.logger().error('AI_CATEGORIZE: erro ao carregar regras: ' + String(err))
    }

    $app.logger().info('AI_CATEGORIZE: carregou ' + rules.length + ' regras de keyword')

    var categorizedByRules = 0
    var stillUncategorized = []

    for (var j = 0; j < uncategorizedItems.length; j++) {
      var item = uncategorizedItems[j]
      var description = item.getString('description') || ''
      var bestMatch = null
      var bestKeywordLen = 0
      var bestKeyword = ''
      var lowerDesc = description.toLowerCase()

      for (var k = 0; k < rules.length; k++) {
        var keyword = rules[k].getString('keyword').toLowerCase()
        var matchType = rules[k].getString('match_type')
        var categoryId = rules[k].getString('category_id')

        var isMatch = false
        if (matchType === 'contains') {
          isMatch = lowerDesc.indexOf(keyword) !== -1
        } else if (matchType === 'starts_with') {
          isMatch = lowerDesc.indexOf(keyword) === 0
        }

        if (isMatch && keyword.length > bestKeywordLen) {
          bestMatch = categoryId
          bestKeywordLen = keyword.length
          bestKeyword = keyword
        }
      }

      if (bestMatch) {
        $app
          .logger()
          .info(
            'AI_CATEGORIZE: item "' +
              description +
              '" match regra "' +
              bestKeyword +
              '" -> categoria ' +
              bestMatch,
          )
        try {
          var ruleRecord = $app.findRecordById('invoice_items', item.id)
          ruleRecord.set('suggested_category_id', bestMatch)
          $app.save(ruleRecord)
          categorizedByRules++
        } catch (saveErr) {
          $app
            .logger()
            .error(
              'AI_CATEGORIZE: failed to save rule-based category',
              'item_id',
              item.id,
              'error',
              String(saveErr),
            )
          stillUncategorized.push(item)
        }
      } else {
        stillUncategorized.push(item)
      }
    }

    var categorizedByAI = 0
    var aiError = null
    var failedStep = null

    if (stillUncategorized.length > 0) {
      $app
        .logger()
        .info(
          'AI_CATEGORIZE: ' +
            stillUncategorized.length +
            ' itens sem match de regra, enviando para Gemini',
        )

      var hasApiKey =
        $secrets.has('SKIP_AI_GATEWAY_API_KEY') && $secrets.get('SKIP_AI_GATEWAY_API_KEY') !== ''

      if (hasApiKey) {
        $app.logger().info('AI_CATEGORIZE: API key configurada = sim')
      } else {
        $app.logger().info('AI_CATEGORIZE: API key configurada = NÃO')
      }

      var categories = []
      try {
        categories = $app.findRecordsByFilter(
          'categories',
          'family_id = "' + familyId + '" && type = "expense"',
          'created',
          100,
          0,
        )
      } catch (err) {
        $app.logger().error('AI_CATEGORIZE: erro ao carregar categorias: ' + String(err))
      }

      if (categories.length === 0) {
        aiError = 'No categories available for AI categorization'
        failedStep = 'load_categories'
        $app.logger().info('AI_CATEGORIZE: no categories found, skipping AI step')
      } else {
        var validCategoryIds = {}
        var categoryList = ''
        for (var cl = 0; cl < categories.length; cl++) {
          validCategoryIds[categories[cl].id] = true
          categoryList += categories[cl].id + ': ' + categories[cl].getString('name') + '\n'
        }

        var itemList = ''
        for (var il = 0; il < stillUncategorized.length; il++) {
          itemList += il + ': ' + stillUncategorized[il].getString('description') + '\n'
        }

        var systemPrompt =
          'You are a financial categorization assistant for a Brazilian family finance app. Given a list of credit card invoice items and available categories, assign each item to the most appropriate category. Respond ONLY with a valid JSON array of objects with "index" (number) and "category_id" (string) properties. Do not include any other text or explanation.'

        var userPrompt =
          'Available categories (id: name):\n' +
          categoryList +
          '\nItems to categorize (index: description):\n' +
          itemList +
          '\nRespond with JSON array like [{"index": 0, "category_id": "abc123"}].'

        var fullPrompt = systemPrompt + '\n\n' + userPrompt

        $app.logger().info('AI_CATEGORIZE: modelo = fast')
        $app.logger().info('AI_CATEGORIZE: prompt = ' + fullPrompt.substring(0, 500))

        try {
          var reply = $ai.chat({
            model: 'fast',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          })

          var content = reply.choices[0].message.content
          $app.logger().info('AI_CATEGORIZE: resposta Gemini = ' + content)

          var jsonStr = content.trim()
          if (jsonStr.indexOf('```') === 0) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
          }

          var arrayStart = jsonStr.indexOf('[')
          var arrayEnd = jsonStr.lastIndexOf(']')
          if (arrayStart !== -1 && arrayEnd !== -1) {
            jsonStr = jsonStr.substring(arrayStart, arrayEnd + 1)
          }

          var assignments = JSON.parse(jsonStr)

          for (var m = 0; m < assignments.length; m++) {
            var assignment = assignments[m]
            var aiItem = stillUncategorized[assignment.index]
            if (aiItem && assignment.category_id && validCategoryIds[assignment.category_id]) {
              try {
                var aiRecord = $app.findRecordById('invoice_items', aiItem.id)
                aiRecord.set('suggested_category_id', assignment.category_id)
                $app.save(aiRecord)
                categorizedByAI++
              } catch (saveErr) {
                $app
                  .logger()
                  .error(
                    'AI_CATEGORIZE: failed to save AI category suggestion',
                    'item_id',
                    aiItem.id,
                    'error',
                    String(saveErr),
                  )
              }
            }
          }
        } catch (err) {
          aiError = String(err.message || err)
          failedStep = 'gemini_call'
          $app
            .logger()
            .error(
              'AI_CATEGORIZE: erro Gemini = ' +
                err.toString() +
                ' stack = ' +
                (err.stack || 'no stack'),
            )
        }
      }
    }

    var noMatch = stillUncategorized.length - categorizedByAI

    $app
      .logger()
      .info(
        'AI_CATEGORIZE: fim - by_rules=' +
          categorizedByRules +
          ' by_ai=' +
          categorizedByAI +
          ' no_match=' +
          noMatch,
      )

    return e.json(200, {
      success: true,
      categorized_by_rules: categorizedByRules,
      categorized_by_ai: categorizedByAI,
      no_match: noMatch,
      ai_error: aiError,
      step: failedStep,
    })
  },
  $apis.requireAuth(),
)
