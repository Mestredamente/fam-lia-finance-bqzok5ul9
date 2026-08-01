routerAdd(
  'POST',
  '/backend/v1/parse-invoice',
  (e) => {
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
    var fileUrl = pbUrl + '/api/files/invoices/' + invoiceId + '/' + fileName

    var downloadRes = $http.send({
      url: fileUrl,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
      timeout: 30,
    })
    if (downloadRes.statusCode !== 200) {
      invoice.set('parsed_data', JSON.stringify({ error: 'Falha ao baixar arquivo' }))
      invoice.set('parsed_at', new Date().toISOString())
      $app.save(invoice)
      return e.json(500, { success: false, error: 'Falha ao baixar arquivo' })
    }

    var rawBody = downloadRes.body
    var fileSize = rawBody.length

    if (fileSize > 10 * 1024 * 1024) {
      invoice.set('parsed_data', JSON.stringify({ error: 'Arquivo muito grande. Máximo 10MB.' }))
      invoice.set('parsed_at', new Date().toISOString())
      $app.save(invoice)
      return e.json(400, { success: false, error: 'Arquivo muito grande. Máximo 10MB.' })
    }

    var ext = fileName.split('.').pop().toLowerCase()
    var isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png'

    var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    var b64 = ''
    for (var i = 0; i < rawBody.length; i += 3) {
      var a = rawBody[i],
        b = i + 1 < rawBody.length ? rawBody[i + 1] : 0,
        c = i + 2 < rawBody.length ? rawBody[i + 2] : 0
      b64 += b64chars[a >> 2] + b64chars[((a & 3) << 4) | (b >> 4)]
      b64 += i + 1 < rawBody.length ? b64chars[((b & 15) << 2) | (c >> 6)] : '='
      b64 += i + 2 < rawBody.length ? b64chars[c & 63] : '='
    }

    var sysPrompt =
      'Você é um assistente financeiro. Extraia todos os itens da fatura de cartão de crédito brasileira. Retorne APENAS JSON válido: {"total_amount": number, "items": [{"description": "string", "amount": number, "date": "YYYY-MM-DD", "category_name": "string"}]}. Categorias: Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Mercado, Restaurantes, Assinaturas, Outros.'

    var messages = [{ role: 'system', content: sysPrompt }]
    if (isImage) {
      var mime = ext === 'png' ? 'image/png' : 'image/jpeg'
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Extraia todos os itens desta fatura.' },
          { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } },
        ],
      })
    } else {
      var binary = ''
      for (var j = 0; j < rawBody.length; j++) binary += String.fromCharCode(rawBody[j])
      var matches = binary.match(/\(([^)]+)\)/g)
      var text = matches
        ? matches
            .map(function (m) {
              return m.slice(1, -1)
            })
            .join(' ')
        : ''

      if (text.length < 50) {
        invoice.set(
          'parsed_data',
          JSON.stringify({
            error:
              'Não foi possível extrair texto do PDF. Tente enviar uma imagem (JPG/PNG) da fatura.',
          }),
        )
        invoice.set('parsed_at', new Date().toISOString())
        $app.save(invoice)
        return e.json(400, {
          success: false,
          error:
            'Não foi possível extrair texto do PDF. Tente enviar uma imagem (JPG/PNG) da fatura.',
        })
      }

      messages.push({
        role: 'user',
        content: 'Extraia os itens desta fatura:\n' + text.substring(0, 8000),
      })
    }

    var maxRetries = 3
    var backoffDelays = [2000, 4000, 8000]
    var aiResult = null
    var aiError = null

    for (var retry = 0; retry < maxRetries; retry++) {
      try {
        aiResult = $ai.chat({ model: 'fast', messages: messages })
        aiError = null
        break
      } catch (err) {
        aiError = err
        var errStatus = err.status || 0

        if (errStatus === 400 || errStatus === 401) {
          var errDetail = err.message || 'erro de autenticação ou requisição inválida'
          invoice.set(
            'parsed_data',
            JSON.stringify({ error: 'Erro ao processar com IA: ' + errDetail }),
          )
          invoice.set('parsed_at', new Date().toISOString())
          $app.save(invoice)
          return e.json(400, { success: false, error: 'Erro ao processar com IA: ' + errDetail })
        }

        if (retry < maxRetries - 1) {
          var delay = backoffDelays[retry] || 8000
          var startWait = Date.now()
          while (Date.now() - startWait < delay) {}
        }
      }
    }

    if (aiError) {
      invoice.set(
        'parsed_data',
        JSON.stringify({ error: 'Falha ao processar com IA após 3 tentativas. Tente novamente.' }),
      )
      invoice.set('parsed_at', new Date().toISOString())
      $app.save(invoice)
      return e.json(500, {
        success: false,
        error: 'Falha ao processar com IA após 3 tentativas. Tente novamente.',
      })
    }

    var aiContent = aiResult.choices[0].message.content
    var jsonStr = aiContent
    var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cbMatch) jsonStr = cbMatch[1]
    else {
      var s = aiContent.indexOf('{'),
        en = aiContent.lastIndexOf('}')
      if (s !== -1 && en !== -1) jsonStr = aiContent.substring(s, en + 1)
    }

    var parsed = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      invoice.set(
        'parsed_data',
        JSON.stringify({ error: 'Resposta da IA em formato inválido', raw_response: aiContent }),
      )
      invoice.set('parsed_at', new Date().toISOString())
      $app.save(invoice)
      return e.json(500, { success: false, error: 'Resposta da IA em formato inválido' })
    }

    if (!parsed.items || !Array.isArray(parsed.items)) {
      invoice.set(
        'parsed_data',
        JSON.stringify({ error: 'Resposta da IA não contém itens', raw_response: aiContent }),
      )
      invoice.set('parsed_at', new Date().toISOString())
      $app.save(invoice)
      return e.json(500, { success: false, error: 'Resposta da IA não contém itens' })
    }

    var familyId = invoice.getString('family_id')
    var categories = $app.findRecordsByFilter(
      'categories',
      'family_id = "' + familyId + '"',
      'created',
      100,
      0,
    )
    var catMap = {}
    for (var k = 0; k < categories.length; k++)
      catMap[categories[k].getString('name').toLowerCase()] = categories[k].getId()

    var itemsCol = $app.findCollectionByNameOrId('invoice_items')
    var itemsCreated = 0
    for (var m = 0; m < parsed.items.length; m++) {
      var it = parsed.items[m]
      var ir = new Record(itemsCol)
      ir.set('invoice_id', invoiceId)
      ir.set('family_id', familyId)
      ir.set('description', it.description || 'Item sem descrição')
      ir.set('amount', it.amount || 0)
      if (it.date) ir.set('transaction_date', it.date)
      var cn = (it.category_name || '').toLowerCase()
      if (catMap[cn]) ir.set('suggested_category_id', catMap[cn])
      ir.set('is_confirmed', false)
      $app.save(ir)
      itemsCreated++
    }

    invoice.set('parsed_data', JSON.stringify(parsed))
    invoice.set('parsed_at', new Date().toISOString())
    if (parsed.total_amount) invoice.set('total_amount', parsed.total_amount)
    $app.save(invoice)
    return e.json(200, { success: true, itemsCount: itemsCreated })
  },
  $apis.requireAuth(),
)
