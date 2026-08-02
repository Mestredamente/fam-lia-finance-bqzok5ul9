routerAdd(
  'POST',
  '/backend/v1/parse-invoice',
  (e) => {
    var chosenModel = 'gemini-flash-latest'
    var diagInfo = {
      url: '',
      model: chosenModel,
      logs: [],
      finishReason: '',
      repairAttempted: false,
      repairSucceeded: false,
      rawAiExcerpt: '',
      cleanedJsonBeforeParse: '',
      parseError: '',
    }
    var rawGeminiResponse = ''

    function jsonRes(status, payload) {
      payload.diagnostics = diagInfo
      if (rawGeminiResponse) payload.raw_gemini_response = rawGeminiResponse.substring(0, 2000)
      return e.json(status, payload)
    }

    function sanitize(s) {
      if (!s) return ''
      var t = String(s)
      t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_HASH]')
      t = t.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF_HASH]')
      t = t.replace(/(\+?\d{2})?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[PHONE_HASH]')
      t = t.replace(/R\$\s?\d+[.,]?\d*/g, '[VALUE_HASH]')
      return t
    }

    function bodyToText(rawBody) {
      if (!rawBody) return ''
      if (typeof rawBody === 'string') return rawBody
      if (rawBody instanceof ArrayBuffer) {
        var bytes = new Uint8Array(rawBody)
        var chars = []
        for (var bi = 0; bi < bytes.length; bi++) chars.push(String.fromCharCode(bytes[bi]))
        return chars.join('')
      }
      if (rawBody && typeof rawBody.length === 'number' && typeof rawBody[0] === 'number') {
        var bChars = []
        for (var bj = 0; bj < rawBody.length; bj++) bChars.push(String.fromCharCode(rawBody[bj]))
        return bChars.join('')
      }
      try {
        return String(rawBody)
      } catch (_) {
        return ''
      }
    }

    function saveError(inv, msg, rawResp, model) {
      var payload = { error: msg, timestamp: new Date().toISOString(), model: model || null }
      if (rawResp) payload.raw_response = String(rawResp).substring(0, 2000)
      inv.set('parsed_data', JSON.stringify(payload))
      inv.set('parsed_at', new Date().toISOString())
      inv.set('status', 'error')
      $app.save(inv)
    }

    function sleep(ms) {
      var start = Date.now()
      while (Date.now() - start < ms) {}
    }

    var GEMINI_API_KEY = $secrets.get('GEMINI_API_KEY') || ''
    if (!GEMINI_API_KEY) {
      $app.logger().error('GEMINI_API_KEY not configured')
      return jsonRes(500, {
        success: false,
        error: 'Chave da API Gemini não configurada. Contate o suporte.',
      })
    }

    $app.logger().info('PARSE_INVOICE: chave começa com = ' + GEMINI_API_KEY.substring(0, 10))

    var body = e.requestInfo().body || {}
    var invoiceId = body.invoice_id || ''
    if (!invoiceId) return e.badRequestError('ID da fatura é obrigatório')

    var invoice = null
    try {
      invoice = $app.findRecordById('invoices', invoiceId)
    } catch (_) {
      return e.badRequestError('Fatura não encontrada')
    }

    var fileName = invoice.getString('raw_file_url')
    if (!fileName) return e.badRequestError('Nenhuma fatura para processar')

    var pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
    var token = $secrets.get('PB_SUPERUSER_TOKEN') || ''
    if (!token) {
      $app.logger().error('PB_SUPERUSER_TOKEN not configured')
      saveError(invoice, 'Token de autenticação interno não configurado.')
      return jsonRes(500, { success: false, error: 'Token de autenticação não configurado' })
    }

    invoice.set('status', 'pending')
    invoice.set('parsed_at', null)
    $app.save(invoice)

    try {
      var oldItems = $app.findRecordsByFilter(
        'invoice_items',
        'invoice_id = "' + invoiceId + '"',
        'created',
        500,
        0,
      )
      for (var oi = 0; oi < oldItems.length; oi++) $app.delete(oldItems[oi])
    } catch (_) {}

    var fileUrl = pbUrl + '/api/files/invoices/' + invoiceId + '/' + fileName
    var downloadRes = $http.send({
      url: fileUrl,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
      timeout: 30,
    })

    if (downloadRes.statusCode !== 200) {
      $app
        .logger()
        .error('File download failed', 'status', downloadRes.statusCode, 'invoice_id', invoiceId)
      saveError(invoice, 'Falha ao baixar arquivo', null, chosenModel)
      return jsonRes(500, { success: false, error: 'Falha ao baixar arquivo' })
    }

    var rawBody = downloadRes.body
    var fileSize = rawBody.length
    $app.logger().info('File downloaded', 'size', fileSize, 'invoice_id', invoiceId)

    if (fileSize === 0) {
      saveError(invoice, 'Arquivo vazio ou corrompido', null, chosenModel)
      return jsonRes(400, { success: false, error: 'Arquivo vazio ou corrompido' })
    }
    if (fileSize > 10 * 1024 * 1024) {
      saveError(invoice, 'Arquivo muito grande. Máximo 10MB.', null, chosenModel)
      return jsonRes(400, { success: false, error: 'Arquivo muito grande. Máximo 10MB.' })
    }

    var ext = fileName.split('.').pop().toLowerCase()
    var mimeType = 'application/pdf'
    if (ext === 'pdf') mimeType = 'application/pdf'
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
    else if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'heic') mimeType = 'image/heic'

    $app.logger().info('MIME detected', 'mime', mimeType, 'ext', ext, 'invoice_id', invoiceId)

    var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    var b64Parts = []
    for (var i = 0; i < rawBody.length; i += 3) {
      var a = rawBody[i],
        b = i + 1 < rawBody.length ? rawBody[i + 1] : 0,
        c = i + 2 < rawBody.length ? rawBody[i + 2] : 0
      b64Parts.push(
        b64chars[a >> 2] +
          b64chars[((a & 3) << 4) | (b >> 4)] +
          (i + 1 < rawBody.length ? b64chars[((b & 15) << 2) | (c >> 6)] : '=') +
          (i + 2 < rawBody.length ? b64chars[c & 63] : '='),
      )
    }
    var b64 = b64Parts.join('')
    $app.logger().info('Base64 encoded', 'payload_size', b64.length, 'invoice_id', invoiceId)

    var sysPrompt =
      'Você é um assistente financeiro especializado em faturas de cartão de crédito brasileiras. Extraia TODAS as transações individuais da fatura. IGNORE cabeçalhos, rodapés, totais, taxas, juros, multas e impostos. Para cada transação, extraia: description (nome CONCISO do estabelecimento com data, ex: "MERCADO X 12/05", preservando parcelas como "2/3"), amount (valor numérico sem "R$" ou vírgulas, use ponto decimal), date (data no formato YYYY-MM-DD, ou null se não visível). Se houver valores em moeda estrangeira com taxa de conversão visível, converta para BRL. Se não houver taxa, use o valor original. MANTENHA as descrições curtas (apenas nome do estabelecimento e data) para reduzir o tamanho da resposta e evitar truncamento.\n\nEstrutura esperada da resposta: { items: [ { description: string, amount: number, date: string } ] }\n\nIMPORTANTE: Não inclua markdown formatting. Não use ```json ou ```. Retorne apenas o JSON puro.\n\nResponda APENAS com JSON válido, sem markdown, sem texto explicativo, sem blocos de código. Comece com { e termine com }. Não use crases.'

    var geminiBody = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: b64 } },
            {
              text:
                sysPrompt +
                '\n\nAnalise a fatura de cartão de crédito anexada e extraia todas as transações individuais.',
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, topK: 1, topP: 0.8, maxOutputTokens: 16384 },
    })

    var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
    var geminiUrl = GEMINI_BASE + '/models/' + chosenModel + ':generateContent'

    $app.logger().info('PARSE_INVOICE: URL = ' + geminiUrl)
    $app.logger().info('PARSE_INVOICE: modelo = ' + chosenModel)
    diagInfo.url = geminiUrl
    diagInfo.logs.push('PARSE_INVOICE: URL = ' + geminiUrl)
    diagInfo.logs.push('PARSE_INVOICE: modelo = ' + chosenModel)

    var maxRetries = 3
    var backoffDelays = [2000, 4000, 8000]
    var geminiResult = null
    var geminiError = null
    var lastErrorDetail = ''
    var lastErrorStatus = 0

    for (var retry = 0; retry < maxRetries; retry++) {
      $app
        .logger()
        .info('Gemini attempt', 'attempt', retry + 1, 'model', chosenModel, 'invoice_id', invoiceId)
      try {
        var gRes = $http.send({
          url: geminiUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_API_KEY },
          body: geminiBody,
          timeout: 120,
        })

        diagInfo.logs.push('Gemini attempt ' + (retry + 1) + ': HTTP ' + gRes.statusCode)

        if (gRes.statusCode === 200) {
          geminiResult = gRes
          geminiError = null
          break
        }

        lastErrorStatus = gRes.statusCode
        var errBodyText = bodyToText(gRes.body)
        lastErrorDetail = errBodyText.substring(0, 500)
        rawGeminiResponse = errBodyText

        if (gRes.statusCode === 400 || gRes.statusCode === 401) {
          $app
            .logger()
            .error(
              'Gemini auth/config error',
              'status',
              gRes.statusCode,
              'detail',
              sanitize(lastErrorDetail),
              'invoice_id',
              invoiceId,
            )
          saveError(
            invoice,
            'Erro de configuração/credencial Gemini: ' +
              sanitize(lastErrorDetail).substring(0, 200),
            errBodyText.substring(0, 2000),
            chosenModel,
          )
          if (gRes.statusCode === 401)
            return jsonRes(401, {
              success: false,
              error: 'Erro de autenticação com a API Gemini. Verifique a chave de API.',
              raw_error: lastErrorDetail,
            })
          return jsonRes(400, {
            success: false,
            error: 'Erro de configuração da API Gemini.',
            raw_error: lastErrorDetail,
          })
        }
        if (gRes.statusCode === 404) {
          $app
            .logger()
            .error(
              'Gemini model not found',
              'status',
              404,
              'model',
              chosenModel,
              'invoice_id',
              invoiceId,
            )
          saveError(invoice, 'Modelo de IA não disponível. Contate o suporte.', null, chosenModel)
          return jsonRes(404, {
            success: false,
            error: 'Modelo de IA não disponível. Contate o suporte.',
            raw_error: lastErrorDetail,
          })
        }
        if (gRes.statusCode === 429 || gRes.statusCode === 503) {
          $app
            .logger()
            .warn(
              'Gemini retryable error',
              'attempt',
              retry + 1,
              'status',
              gRes.statusCode,
              'error',
              sanitize(lastErrorDetail),
              'invoice_id',
              invoiceId,
            )
          geminiError = new Error('HTTP ' + gRes.statusCode)
          if (retry < maxRetries - 1) sleep(backoffDelays[retry] || 8000)
        } else {
          $app
            .logger()
            .error(
              'Gemini non-transient error — failing immediately',
              'status',
              gRes.statusCode,
              'detail',
              sanitize(lastErrorDetail),
              'invoice_id',
              invoiceId,
            )
          saveError(
            invoice,
            'Erro da API Gemini (HTTP ' +
              gRes.statusCode +
              '): ' +
              sanitize(lastErrorDetail).substring(0, 200),
            errBodyText.substring(0, 2000),
            chosenModel,
          )
          var nonTransientStatus =
            gRes.statusCode >= 400 && gRes.statusCode < 600 ? gRes.statusCode : 500
          return jsonRes(nonTransientStatus, {
            success: false,
            error: 'Erro da API Gemini (HTTP ' + gRes.statusCode + ').',
            raw_error: lastErrorDetail,
          })
        }
      } catch (httpErr) {
        lastErrorDetail = String(httpErr.message || httpErr)
        lastErrorStatus = 0
        rawGeminiResponse = String(httpErr.message || httpErr)
        $app
          .logger()
          .error(
            'Gemini HTTP exception — failing immediately',
            'attempt',
            retry + 1,
            'error',
            sanitize(lastErrorDetail),
            'invoice_id',
            invoiceId,
          )
        saveError(
          invoice,
          'Erro de conexão com a API Gemini: ' + sanitize(lastErrorDetail).substring(0, 200),
          null,
          chosenModel,
        )
        return jsonRes(503, {
          success: false,
          error: 'Erro de conexão com a API Gemini.',
          raw_error: lastErrorDetail,
        })
      }
    }

    if (geminiError) {
      $app
        .logger()
        .error(
          'Gemini failed after retries',
          'invoice_id',
          invoiceId,
          'last_error',
          sanitize(lastErrorDetail),
          'last_status',
          lastErrorStatus,
        )
      if (lastErrorStatus === 429) {
        saveError(
          invoice,
          'Limite de requisições da Gemini excedido. Tente novamente em alguns minutos.',
          null,
          chosenModel,
        )
        return jsonRes(429, {
          success: false,
          error: 'Serviço de IA sobrecarregado. Tente novamente em alguns minutos.',
          raw_error: lastErrorDetail,
        })
      }
      saveError(
        invoice,
        'Serviço de IA temporariamente indisponível: ' +
          sanitize(lastErrorDetail).substring(0, 200),
        null,
        chosenModel,
      )
      return jsonRes(503, {
        success: false,
        error: 'Serviço de IA temporariamente indisponível. Tente novamente.',
        raw_error: lastErrorDetail,
      })
    }

    var responseBody = bodyToText(geminiResult.body)
    $app
      .logger()
      .info(
        '[parse-invoice] Tipo da resposta:',
        'type',
        typeof geminiResult.body,
        'body_type',
        typeof responseBody,
        'invoice_id',
        invoiceId,
      )

    var parsedJson = null
    try {
      parsedJson = JSON.parse(responseBody)
    } catch (parseErr) {
      saveError(
        invoice,
        'Resposta da Gemini não é JSON válido',
        responseBody.substring(0, 2000),
        chosenModel,
      )
      return jsonRes(500, {
        success: false,
        error: 'Resposta da Gemini em formato inválido',
        raw_error: responseBody.substring(0, 500),
      })
    }

    var aiContent = ''
    var tokensInput = 0
    var tokensOutput = 0
    try {
      if (parsedJson.candidates && parsedJson.candidates.length > 0) {
        var candidate = parsedJson.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          for (var pi = 0; pi < candidate.content.parts.length; pi++) {
            if (candidate.content.parts[pi].text) aiContent += candidate.content.parts[pi].text
          }
        }
      }
      if (parsedJson.usageMetadata) {
        tokensInput = parsedJson.usageMetadata.promptTokenCount || 0
        tokensOutput = parsedJson.usageMetadata.candidatesTokenCount || 0
      }
      var finishReason = ''
      if (parsedJson.candidates && parsedJson.candidates.length > 0) {
        finishReason = parsedJson.candidates[0].finishReason || ''
      }
      diagInfo.finishReason = finishReason
      diagInfo.logs.push('PARSE_INVOICE: finishReason = ' + finishReason)
      $app
        .logger()
        .info('PARSE_INVOICE: finishReason', 'reason', finishReason, 'invoice_id', invoiceId)
      if (finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION') {
        diagInfo.logs.push(
          'PARSE_INVOICE: Response truncated due to ' +
            finishReason +
            '. Attempting recovery with partial response.',
        )
        $app
          .logger()
          .warn(
            'PARSE_INVOICE: AI response truncated',
            'reason',
            finishReason,
            'invoice_id',
            invoiceId,
          )
      }
    } catch (extractErr) {
      saveError(
        invoice,
        'Falha ao extrair texto da resposta Gemini',
        responseBody.substring(0, 2000),
        chosenModel,
      )
      return jsonRes(500, {
        success: false,
        error: 'Resposta da Gemini em formato inválido',
        raw_error: String(extractErr),
      })
    }

    if (!aiContent || aiContent.trim() === '') {
      saveError(
        invoice,
        'Resposta da Gemini está vazia',
        responseBody.substring(0, 2000),
        chosenModel,
      )
      return jsonRes(500, {
        success: false,
        error: 'Resposta da Gemini está vazia',
        raw_error: responseBody.substring(0, 500),
      })
    }

    diagInfo.rawAiExcerpt = aiContent.substring(0, 500)
    diagInfo.logs.push('Gemini tokens - input: ' + tokensInput + ', output: ' + tokensOutput)
    $app
      .logger()
      .info(
        'Gemini tokens',
        'input',
        tokensInput,
        'output',
        tokensOutput,
        'model',
        chosenModel,
        'invoice_id',
        invoiceId,
      )

    $app
      .logger()
      .info(
        'PARSE_INVOICE: raw Gemini response (first 500 chars)',
        'response',
        aiContent.substring(0, 500),
        'invoice_id',
        invoiceId,
      )
    $app
      .logger()
      .info(
        'PARSE_INVOICE: raw Gemini response (first 1000 chars)',
        'response',
        aiContent.substring(0, 1000),
        'invoice_id',
        invoiceId,
      )

    var jsonStr = aiContent
    var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cbMatch) {
      jsonStr = cbMatch[1].trim()
    } else {
      var firstBrace = aiContent.indexOf('{')
      var firstBracket = aiContent.indexOf('[')
      var lastBrace = aiContent.lastIndexOf('}')
      var lastBracket = aiContent.lastIndexOf(']')
      var startIdx = -1
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIdx = Math.min(firstBrace, firstBracket)
      } else if (firstBrace !== -1) {
        startIdx = firstBrace
      } else {
        startIdx = firstBracket
      }
      var endIdx = -1
      if (lastBrace !== -1 && lastBracket !== -1) {
        endIdx = Math.max(lastBrace, lastBracket)
      } else if (lastBrace !== -1) {
        endIdx = lastBrace
      } else {
        endIdx = lastBracket
      }
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = aiContent.substring(startIdx, endIdx + 1)
      }
    }
    jsonStr = jsonStr.trim()

    diagInfo.cleanedJsonBeforeParse = jsonStr.substring(0, 500)

    $app
      .logger()
      .info(
        'PARSE_INVOICE: cleaned JSON before parse',
        'json',
        jsonStr.substring(0, 500),
        'invoice_id',
        invoiceId,
      )

    if (!jsonStr || jsonStr.trim() === '') {
      saveError(
        invoice,
        'Resposta da IA não contém JSON válido',
        aiContent.substring(0, 2000),
        chosenModel,
      )
      return jsonRes(500, {
        success: false,
        error: 'Resposta da IA não contém JSON válido',
        raw_error: aiContent.substring(0, 500),
      })
    }

    var parsed = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      $app
        .logger()
        .warn(
          'PARSE_INVOICE: JSON.parse() error, attempting repair',
          'error',
          String(parseErr.message || parseErr),
          'invoice_id',
          invoiceId,
        )
      diagInfo.logs.push(
        'PARSE_INVOICE: JSON.parse failed: ' + String(parseErr.message || parseErr),
      )
      diagInfo.parseError = String(parseErr.message || parseErr)
      diagInfo.repairAttempted = true

      var repairedJson = jsonStr
      var openBraces = (repairedJson.match(/\{/g) || []).length
      var closeBraces = (repairedJson.match(/\}/g) || []).length
      var openBrackets = (repairedJson.match(/\[/g) || []).length
      var closeBrackets = (repairedJson.match(/\]/g) || []).length
      var missingBraces = openBraces - closeBraces
      var missingBrackets = openBrackets - closeBrackets
      $app
        .logger()
        .info(
          'PARSE_INVOICE: JSON repair stats',
          'missing_braces',
          missingBraces,
          'missing_brackets',
          missingBrackets,
          'invoice_id',
          invoiceId,
        )
      diagInfo.logs.push(
        'PARSE_INVOICE: repair - missing braces: ' +
          missingBraces +
          ', missing brackets: ' +
          missingBrackets,
      )

      if (repairedJson.trim().endsWith(',')) {
        repairedJson = repairedJson.trim().slice(0, -1)
      }
      for (var rb = 0; rb < missingBrackets; rb++) repairedJson += ']'
      for (var rc = 0; rc < missingBraces; rc++) repairedJson += '}'

      diagInfo.logs.push(
        'PARSE_INVOICE: repaired JSON (first 300 chars): ' + repairedJson.substring(0, 300),
      )

      try {
        parsed = JSON.parse(repairedJson)
        diagInfo.repairSucceeded = true
        diagInfo.logs.push('PARSE_INVOICE: JSON repair succeeded!')
        $app.logger().info('PARSE_INVOICE: JSON repair succeeded', 'invoice_id', invoiceId)
      } catch (repairErr) {
        diagInfo.repairSucceeded = false
        diagInfo.logs.push(
          'PARSE_INVOICE: JSON repair failed: ' + String(repairErr.message || repairErr),
        )
        $app
          .logger()
          .error(
            'PARSE_INVOICE: JSON repair also failed',
            'error',
            String(repairErr.message || repairErr),
            'invoice_id',
            invoiceId,
          )
        saveError(
          invoice,
          'JSON malformado na resposta da IA: ' +
            String(parseErr.message || parseErr).substring(0, 200),
          aiContent,
          chosenModel,
        )
        return e.json(500, {
          success: false,
          error: 'JSON malformado na resposta da IA',
          raw_gemini_response: aiContent,
          diagnostics: diagInfo,
        })
      }
    }

    $app
      .logger()
      .info(
        'PARSE_INVOICE: items extracted',
        'count',
        Array.isArray(parsed.items) ? parsed.items.length : 0,
        'invoice_id',
        invoiceId,
      )

    if (!parsed.items || !Array.isArray(parsed.items)) {
      saveError(
        invoice,
        'Resposta da IA não contém array de items',
        aiContent.substring(0, 2000),
        chosenModel,
      )
      return jsonRes(500, {
        success: false,
        error: 'Resposta da IA não contém array de items',
        raw_error: aiContent.substring(0, 500),
      })
    }

    var validItems = []
    var invalidItems = []
    var totalExtracted = 0

    for (var m = 0; m < parsed.items.length; m++) {
      var it = parsed.items[m]
      var reason = null
      if (!it.description || typeof it.description !== 'string' || it.description.trim() === '')
        reason = 'Descrição ausente ou inválida'
      else if (
        it.amount === undefined ||
        it.amount === null ||
        typeof it.amount !== 'number' ||
        isNaN(it.amount)
      )
        reason = 'Valor ausente ou inválido'
      if (reason) {
        invalidItems.push({ index: m, reason: reason })
      } else {
        var desc = it.description.trim().substring(0, 255)
        var amt = Number(it.amount)
        var itemDate = it.date || null
        if (itemDate && !/^\d{4}-\d{2}-\d{2}$/.test(itemDate)) itemDate = null
        validItems.push({ description: desc, amount: amt, date: itemDate })
        totalExtracted += amt
      }
    }

    var familyId = invoice.getString('family_id')
    var categories = []
    try {
      categories = $app.findRecordsByFilter(
        'categories',
        'family_id = "' + familyId + '"',
        'created',
        100,
        0,
      )
    } catch (_) {}
    var catMap = {}
    for (var k = 0; k < categories.length; k++)
      catMap[categories[k].getString('name').toLowerCase()] = categories[k].id

    var catRules = []
    try {
      catRules = $app.findRecordsByFilter(
        'categorization_rules',
        'family_id = "' + familyId + '"',
        'created',
        200,
        0,
      )
    } catch (_) {}
    $app
      .logger()
      .info(
        'PARSE_INVOICE: categorization rules found',
        'count',
        catRules.length,
        'invoice_id',
        invoiceId,
      )

    var itemsCol = $app.findCollectionByNameOrId('invoice_items')
    var itemsCreated = 0
    for (var vi = 0; vi < validItems.length; vi++) {
      var vItem = validItems[vi]
      try {
        var ir = new Record(itemsCol)
        ir.set('invoice_id', invoiceId)
        ir.set('family_id', familyId)
        ir.set('description', vItem.description)
        ir.set('amount', vItem.amount)
        if (vItem.date) ir.set('transaction_date', vItem.date)
        var lowerDesc = vItem.description.toLowerCase()
        var suggestedCat = null

        for (var ri2 = 0; ri2 < catRules.length; ri2++) {
          var ruleKeyword = catRules[ri2].getString('keyword').toLowerCase()
          var ruleType = catRules[ri2].getString('match_type')
          var ruleCatId = catRules[ri2].getString('category_id')
          if (ruleType === 'starts_with') {
            if (lowerDesc.indexOf(ruleKeyword) === 0) {
              suggestedCat = ruleCatId
              break
            }
          } else {
            if (lowerDesc.indexOf(ruleKeyword) !== -1) {
              suggestedCat = ruleCatId
              break
            }
          }
        }

        if (!suggestedCat) {
          for (var catKey in catMap) {
            if (lowerDesc.indexOf(catKey) !== -1) {
              suggestedCat = catMap[catKey]
              break
            }
          }
        }

        if (suggestedCat) ir.set('suggested_category_id', suggestedCat)
        ir.set('is_confirmed', false)
        $app.save(ir)
        itemsCreated++
      } catch (saveErr) {
        $app
          .logger()
          .error(
            'Failed to save invoice item',
            'invoice_id',
            invoiceId,
            'error',
            sanitize(String(saveErr)).substring(0, 200),
          )
      }
    }

    var successPayload = {
      items_count: itemsCreated,
      total_extracted: parsed.total_extracted || totalExtracted,
      currency: parsed.currency || 'BRL',
      confidence: parsed.confidence || 'medium',
      tokens_used: { input: tokensInput, output: tokensOutput },
      processed_at: new Date().toISOString(),
      model: chosenModel,
    }
    if (invalidItems.length > 0) successPayload.invalid_items = invalidItems

    invoice.set('parsed_data', JSON.stringify(successPayload))
    invoice.set('parsed_at', new Date().toISOString())
    invoice.set('status', 'parsed')
    $app.save(invoice)

    diagInfo.logs.push('Invoice parsed successfully. Items: ' + itemsCreated)
    $app
      .logger()
      .info(
        'Invoice parsed successfully',
        'items',
        itemsCreated,
        'model',
        chosenModel,
        'invoice_id',
        invoiceId,
      )

    return jsonRes(200, {
      success: true,
      items_count: itemsCreated,
      total: parsed.total_extracted || totalExtracted,
      confidence: parsed.confidence || 'medium',
    })
  },
  $apis.requireAuth(),
)
