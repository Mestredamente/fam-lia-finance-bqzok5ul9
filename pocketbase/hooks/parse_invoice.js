routerAdd(
  'POST',
  '/backend/v1/parse-invoice',
  (e) => {
    var chosenModel = 'gemini-2.5-flash'

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
        for (var bi = 0; bi < bytes.length; bi++) {
          chars.push(String.fromCharCode(bytes[bi]))
        }
        return chars.join('')
      }
      if (rawBody && typeof rawBody.length === 'number' && typeof rawBody[0] === 'number') {
        var bChars = []
        for (var bj = 0; bj < rawBody.length; bj++) {
          bChars.push(String.fromCharCode(rawBody[bj]))
        }
        return bChars.join('')
      }
      try {
        return String(rawBody)
      } catch (_) {
        return ''
      }
    }

    function saveError(inv, msg, rawResp, model) {
      var payload = {
        error: msg,
        timestamp: new Date().toISOString(),
        model: model || null,
      }
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
      return e.json(500, {
        success: false,
        error: 'Chave da API Gemini não configurada. Contate o suporte.',
      })
    }

    $app.logger().info('PARSE_INVOICE: chave começa com = ' + GEMINI_API_KEY.substring(0, 10))
    $app.logger().info('PARSE_INVOICE: modelo ativo = ' + chosenModel)

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
      return e.json(500, {
        success: false,
        error: 'Token de autenticação não configurado',
      })
    }

    // ===== Step 1: Set status to pending and clean old items =====
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
      for (var oi = 0; oi < oldItems.length; oi++) {
        $app.delete(oldItems[oi])
      }
    } catch (_) {}

    // ===== Step 2: Download the file =====
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
      return e.json(500, {
        success: false,
        error: 'Falha ao baixar arquivo',
      })
    }

    var rawBody = downloadRes.body
    var fileSize = rawBody.length

    $app.logger().info('File downloaded', 'size', fileSize, 'invoice_id', invoiceId)

    if (fileSize === 0) {
      saveError(invoice, 'Arquivo vazio ou corrompido', null, chosenModel)
      return e.json(400, {
        success: false,
        error: 'Arquivo vazio ou corrompido',
      })
    }

    if (fileSize > 10 * 1024 * 1024) {
      saveError(invoice, 'Arquivo muito grande. Máximo 10MB.', null, chosenModel)
      return e.json(400, {
        success: false,
        error: 'Arquivo muito grande. Máximo 10MB.',
      })
    }

    // ===== Step 3: Detect MIME type =====
    var ext = fileName.split('.').pop().toLowerCase()
    var mimeType = 'application/pdf'
    if (ext === 'pdf') mimeType = 'application/pdf'
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
    else if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'heic') mimeType = 'image/heic'

    $app.logger().info('MIME detected', 'mime', mimeType, 'ext', ext, 'invoice_id', invoiceId)

    // ===== Step 4: Convert to base64 =====
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

    // ===== Step 5: Build Gemini request =====
    var sysPrompt =
      'Você é um assistente financeiro especializado em faturas de cartão de crédito brasileiras. Extraia TODAS as transações individuais da fatura. IGNORE cabeçalhos, rodapés, totais, taxas, juros, multas e impostos. Para cada transação, extraia: description (descrição do item, preservando notação de parcelas como "2/3"), amount (valor numérico sem "R$" ou vírgulas, use ponto decimal), date (data no formato YYYY-MM-DD, ou null se não visível). Se houver valores em moeda estrangeira com taxa de conversão visível, converta para BRL. Se não houver taxa, use o valor original. Retorne APENAS um JSON válido, sem markdown, sem texto adicional: {"items":[{"description":"string","amount":number,"date":"YYYY-MM-DD|null"}],"total_extracted":number,"currency":"BRL","confidence":"high|medium|low"}'

    var geminiBody = JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: b64,
              },
            },
            {
              text:
                sysPrompt +
                '\n\nAnalise a fatura de cartão de crédito anexada e extraia todas as transações individuais.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    })

    var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
    var geminiUrl =
      GEMINI_BASE + '/models/' + chosenModel + ':generateContent?key=' + GEMINI_API_KEY

    // ===== Step 6: Call Gemini with retries (1 request per attempt, max 3) =====
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
          headers: { 'Content-Type': 'application/json' },
          body: geminiBody,
          timeout: 30,
        })

        $app
          .logger()
          .info(
            '[parse-invoice] Tipo da resposta:',
            'type',
            typeof gRes.body,
            'invoice_id',
            invoiceId,
          )

        if (gRes.statusCode === 200) {
          geminiResult = gRes
          geminiError = null
          break
        }

        lastErrorStatus = gRes.statusCode
        var errBodyText = bodyToText(gRes.body)
        lastErrorDetail = errBodyText.substring(0, 500)

        // Do not retry 400 or 401
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
          if (gRes.statusCode === 401) {
            return e.json(401, {
              success: false,
              error: 'Erro de autenticação com a API Gemini. Verifique a chave de API.',
            })
          }
          return e.json(400, {
            success: false,
            error: 'Erro de configuração da API Gemini.',
          })
        }

        // Handle 404 — model unavailable
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
          return e.json(404, {
            success: false,
            error: 'Modelo de IA não disponível. Contate o suporte.',
          })
        }

        // Retry 429 and 503
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
          if (retry < maxRetries - 1) {
            sleep(backoffDelays[retry] || 8000)
          }
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
          return e.json(nonTransientStatus, {
            success: false,
            error: 'Erro da API Gemini (HTTP ' + gRes.statusCode + ').',
          })
        }
      } catch (httpErr) {
        lastErrorDetail = String(httpErr.message || httpErr)
        lastErrorStatus = 0
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
        return e.json(503, {
          success: false,
          error: 'Erro de conexão com a API Gemini.',
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
        return e.json(429, {
          success: false,
          error: 'Serviço de IA sobrecarregado. Tente novamente em alguns minutos.',
        })
      }

      saveError(
        invoice,
        'Serviço de IA temporariamente indisponível: ' +
          sanitize(lastErrorDetail).substring(0, 200),
        null,
        chosenModel,
      )
      return e.json(503, {
        success: false,
        error: 'Serviço de IA temporariamente indisponível. Tente novamente.',
      })
    }

    // ===== Step 7: Parse Gemini response (read body as text) =====
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
      return e.json(500, {
        success: false,
        error: 'Resposta da Gemini em formato inválido',
      })
    }

    // Extract text from Gemini response: candidates[0].content.parts[0].text
    var aiContent = ''
    var tokensInput = 0
    var tokensOutput = 0
    try {
      if (parsedJson.candidates && parsedJson.candidates.length > 0) {
        var candidate = parsedJson.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          for (var pi = 0; pi < candidate.content.parts.length; pi++) {
            if (candidate.content.parts[pi].text) {
              aiContent += candidate.content.parts[pi].text
            }
          }
        }
      }
      if (parsedJson.usageMetadata) {
        tokensInput = parsedJson.usageMetadata.promptTokenCount || 0
        tokensOutput = parsedJson.usageMetadata.candidatesTokenCount || 0
      }
    } catch (extractErr) {
      saveError(
        invoice,
        'Falha ao extrair texto da resposta Gemini',
        responseBody.substring(0, 2000),
        chosenModel,
      )
      return e.json(500, {
        success: false,
        error: 'Resposta da Gemini em formato inválido',
      })
    }

    if (!aiContent || aiContent.trim() === '') {
      saveError(
        invoice,
        'Resposta da Gemini está vazia',
        responseBody.substring(0, 2000),
        chosenModel,
      )
      return e.json(500, {
        success: false,
        error: 'Resposta da Gemini está vazia',
      })
    }

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

    // ===== Step 8: Extract JSON from content =====
    var jsonStr = aiContent
    var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cbMatch) {
      jsonStr = cbMatch[1]
    } else {
      var s = aiContent.indexOf('{'),
        en = aiContent.lastIndexOf('}')
      if (s !== -1 && en !== -1) jsonStr = aiContent.substring(s, en + 1)
    }

    if (!jsonStr || jsonStr.trim() === '') {
      saveError(
        invoice,
        'Resposta da IA não contém JSON válido',
        aiContent.substring(0, 2000),
        chosenModel,
      )
      return e.json(500, {
        success: false,
        error: 'Resposta da IA não contém JSON válido',
      })
    }

    var parsed = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      saveError(
        invoice,
        'JSON malformado na resposta da IA',
        aiContent.substring(0, 2000),
        chosenModel,
      )
      return e.json(500, {
        success: false,
        error: 'JSON malformado na resposta da IA',
      })
    }

    if (!parsed.items || !Array.isArray(parsed.items)) {
      saveError(
        invoice,
        'Resposta da IA não contém array de items',
        aiContent.substring(0, 2000),
        chosenModel,
      )
      return e.json(500, {
        success: false,
        error: 'Resposta da IA não contém array de items',
      })
    }

    // ===== Step 9: Validate items =====
    var validItems = []
    var invalidItems = []
    var totalExtracted = 0

    for (var m = 0; m < parsed.items.length; m++) {
      var it = parsed.items[m]
      var reason = null

      if (!it.description || typeof it.description !== 'string' || it.description.trim() === '') {
        reason = 'Descrição ausente ou inválida'
      } else if (
        it.amount === undefined ||
        it.amount === null ||
        typeof it.amount !== 'number' ||
        isNaN(it.amount)
      ) {
        reason = 'Valor ausente ou inválido'
      }

      if (reason) {
        invalidItems.push({ index: m, reason: reason })
      } else {
        var desc = it.description.trim().substring(0, 255)
        var amt = Number(it.amount)
        var itemDate = it.date || null
        // Validate date format
        if (itemDate && !/^\d{4}-\d{2}-\d{2}$/.test(itemDate)) {
          itemDate = null
        }
        validItems.push({
          description: desc,
          amount: amt,
          date: itemDate,
        })
        totalExtracted += amt
      }
    }

    // ===== Step 10: Resolve categories =====
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
    for (var k = 0; k < categories.length; k++) {
      catMap[categories[k].getString('name').toLowerCase()] = categories[k].getId()
    }

    // ===== Step 11: Save valid items =====
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
        for (var catKey in catMap) {
          if (lowerDesc.indexOf(catKey) !== -1) {
            ir.set('suggested_category_id', catMap[catKey])
            break
          }
        }
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

    // ===== Step 12: Update invoice record =====
    var successPayload = {
      items_count: itemsCreated,
      total_extracted: parsed.total_extracted || totalExtracted,
      currency: parsed.currency || 'BRL',
      confidence: parsed.confidence || 'medium',
      tokens_used: { input: tokensInput, output: tokensOutput },
      processed_at: new Date().toISOString(),
      model: chosenModel,
    }
    if (invalidItems.length > 0) {
      successPayload.invalid_items = invalidItems
    }

    invoice.set('parsed_data', JSON.stringify(successPayload))
    invoice.set('parsed_at', new Date().toISOString())
    invoice.set('status', 'parsed')
    $app.save(invoice)

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

    return e.json(200, {
      success: true,
      items_count: itemsCreated,
      total: parsed.total_extracted || totalExtracted,
      confidence: parsed.confidence || 'medium',
    })
  },
  $apis.requireAuth(),
)
