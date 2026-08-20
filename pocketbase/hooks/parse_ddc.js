routerAdd(
  'POST',
  '/backend/v1/parse-ddc',
  (e) => {
    var chosenModel = 'gemini-flash-latest'

    function jsonRes(status, payload) {
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

    function bodyToText(rawBody) {
      if (!rawBody) return ''
      if (typeof rawBody === 'string') return fixMojibake(rawBody)

      var uint8Arr = null
      if (rawBody instanceof ArrayBuffer) {
        uint8Arr = new Uint8Array(rawBody)
      } else if (rawBody && typeof rawBody.length === 'number' && typeof rawBody[0] === 'number') {
        uint8Arr = new Uint8Array(rawBody)
      }

      if (uint8Arr) {
        if (typeof TextDecoder !== 'undefined') {
          try {
            var decoder = new TextDecoder('utf-8')
            return decoder.decode(uint8Arr)
          } catch (_) {}
        }
        try {
          var binaryStr = ''
          var chunkSize = 8192
          for (var i = 0; i < uint8Arr.length; i += chunkSize) {
            var slice = uint8Arr.subarray(i, i + chunkSize)
            binaryStr += String.fromCharCode.apply(null, slice)
          }
          return decodeURIComponent(escape(binaryStr))
        } catch (_) {
          try {
            var fallbackChars = []
            for (var bi = 0; bi < uint8Arr.length; bi++)
              fallbackChars.push(String.fromCharCode(uint8Arr[bi]))
            return fixMojibake(fallbackChars.join(''))
          } catch (_) {}
        }
      }

      try {
        return fixMojibake(String(rawBody))
      } catch (_) {
        return ''
      }
    }

    function sleep(ms) {
      var start = Date.now()
      while (Date.now() - start < ms) {}
    }

    var GEMINI_API_KEY = $secrets.get('GEMINI_API_KEY') || ''
    if (!GEMINI_API_KEY) {
      $app.logger().error('GEMINI_API_KEY not configured for parse-ddc')
      return jsonRes(500, {
        success: false,
        error: 'Chave da API Gemini não configurada. Contate o suporte.',
      })
    }

    var body = e.requestInfo().body || {}
    var pdfBase64 = body.pdf_base64 || ''
    if (!pdfBase64) {
      return jsonRes(400, {
        success: false,
        error: 'Arquivo PDF em formato base64 não fornecido.',
      })
    }

    // Remove data URL header se presente (ex: data:application/pdf;base64,...)
    if (pdfBase64.indexOf(',') !== -1) {
      pdfBase64 = pdfBase64.split(',')[1]
    }
    pdfBase64 = pdfBase64.replace(/[\r\n\s]/g, '')

    var approxSize = (pdfBase64.length * 3) / 4
    if (approxSize > 10 * 1024 * 1024) {
      return jsonRes(400, {
        success: false,
        error: 'Arquivo muito grande. Máximo 10MB.',
      })
    }

    var sysPrompt =
      'Você é um assistente financeiro especializado em documentos bancários brasileiros. Analise este DDC (Documento de Custos e Condições) padronizado pelo BACEN (Resolução CMN 4.192/2013). Extraia APENAS os seguintes campos em JSON:\n\n' +
      '{\n' +
      '  "financed_amount": número (Valor financiado/Valor da operação, sem R$),\n' +
      '  "installment_value": número (Valor da prestação/parcela, sem R$),\n' +
      '  "installments_total": número (Quantidade total de prestações),\n' +
      '  "interest_rate": número (Taxa de juros mensal em %, ex: 1.5 para 1,5% a.m.),\n' +
      '  "cet": número (CET anual em %, ex: 18.5 para 18,5% a.a.),\n' +
      '  "amortization_system": "PRICE" | "SAC" | "Livre" (Sistema de amortização),\n' +
      '  "due_day": número 1-31 (Dia de vencimento),\n' +
      '  "first_due_date": "YYYY-MM-DD" (Data do primeiro vencimento),\n' +
      '  "balance_due": número (Saldo devedor/Saldo a liquidar/Valor para quitação, sem R$),\n' +
      '  "bank_name": string (Nome do banco/instituição financeira)\n' +
      '}\n\n' +
      'Se algum campo não estiver visível no documento, use null. Retorne APENAS JSON puro, sem markdown, sem ```json.'

    var geminiBody = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
            {
              text:
                sysPrompt +
                '\n\nAnalise o documento DDC anexado e extraia os dados solicitados em JSON.',
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, topK: 1, topP: 0.8, maxOutputTokens: 8192 },
    })

    var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
    var geminiUrl = GEMINI_BASE + '/models/' + chosenModel + ':generateContent'

    $app.logger().info('PARSE_DDC: enviando requisição para ' + chosenModel)

    var maxRetries = 3
    var backoffDelays = [2000, 4000, 8000]
    var geminiResult = null
    var geminiError = null
    var lastErrorDetail = ''
    var lastErrorStatus = 0

    for (var retry = 0; retry < maxRetries; retry++) {
      $app.logger().info('PARSE_DDC: tentativa Gemini ' + (retry + 1))
      try {
        var gRes = $http.send({
          url: geminiUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-goog-api-key': GEMINI_API_KEY,
          },
          body: geminiBody,
          timeout: 180,
        })

        if (gRes.statusCode === 200) {
          geminiResult = gRes
          geminiError = null
          break
        }

        lastErrorStatus = gRes.statusCode
        var errBodyText = bodyToText(gRes.body)
        lastErrorDetail = errBodyText.substring(0, 500)

        if (gRes.statusCode === 400 || gRes.statusCode === 401) {
          $app
            .logger()
            .error(
              'PARSE_DDC: Gemini auth/config error',
              'status',
              gRes.statusCode,
              'detail',
              sanitize(lastErrorDetail),
            )
          if (gRes.statusCode === 401) {
            return jsonRes(401, {
              success: false,
              error: 'Erro de autenticação com a API Gemini. Verifique a chave de API.',
            })
          }
          return jsonRes(400, {
            success: false,
            error: 'Documento não pôde ser processado ou formato inválido.',
          })
        }

        if (gRes.statusCode === 404) {
          return jsonRes(404, {
            success: false,
            error: 'Modelo de IA não disponível. Contate o suporte.',
          })
        }

        if (gRes.statusCode === 429 || gRes.statusCode === 503) {
          $app
            .logger()
            .warn(
              'PARSE_DDC: Gemini retryable error',
              'attempt',
              retry + 1,
              'status',
              gRes.statusCode,
            )
          geminiError = new Error('HTTP ' + gRes.statusCode)
          if (retry < maxRetries - 1) sleep(backoffDelays[retry] || 8000)
        } else {
          $app
            .logger()
            .error(
              'PARSE_DDC: Gemini non-transient error',
              'status',
              gRes.statusCode,
              'detail',
              sanitize(lastErrorDetail),
            )
          return jsonRes(500, {
            success: false,
            error:
              'Erro ao processar o DDC com a inteligência artificial (HTTP ' +
              gRes.statusCode +
              ').',
          })
        }
      } catch (httpErr) {
        lastErrorDetail = String(httpErr.message || httpErr)
        lastErrorStatus = 0
        $app.logger().error('PARSE_DDC: Gemini HTTP exception', 'error', sanitize(lastErrorDetail))
        return jsonRes(503, {
          success: false,
          error: 'Tempo esgotado ou erro de conexão com o serviço de IA. Tente novamente.',
        })
      }
    }

    if (geminiError) {
      if (lastErrorStatus === 429) {
        return jsonRes(429, {
          success: false,
          error: 'Serviço de IA sobrecarregado. Tente novamente em alguns minutos.',
        })
      }
      return jsonRes(503, {
        success: false,
        error: 'Serviço temporariamente indisponível. Tente novamente.',
      })
    }

    var responseBody = bodyToText(geminiResult.body)
    var parsedJson = null
    try {
      parsedJson = JSON.parse(responseBody)
    } catch (parseErr) {
      return jsonRes(500, {
        success: false,
        error: 'Resposta da IA em formato inválido.',
      })
    }

    var aiContent = ''
    try {
      if (parsedJson.candidates && parsedJson.candidates.length > 0) {
        var candidate = parsedJson.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          for (var pi = 0; pi < candidate.content.parts.length; pi++) {
            if (candidate.content.parts[pi].text) aiContent += candidate.content.parts[pi].text
          }
        }
      }
    } catch (extractErr) {
      return jsonRes(500, {
        success: false,
        error: 'Falha ao extrair dados do DDC.',
      })
    }

    if (!aiContent || aiContent.trim() === '') {
      return jsonRes(500, {
        success: false,
        error: 'Não foi possível extrair dados do documento.',
      })
    }

    aiContent = fixMojibake(aiContent)

    var jsonStr = aiContent
    var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cbMatch) {
      jsonStr = cbMatch[1].trim()
    } else {
      var firstBrace = aiContent.indexOf('{')
      var lastBrace = aiContent.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = aiContent.substring(firstBrace, lastBrace + 1)
      }
    }
    jsonStr = jsonStr.trim()

    var parsed = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      // Tentativa de reparo
      var repairedJson = jsonStr
      var openBraces = (repairedJson.match(/\{/g) || []).length
      var closeBraces = (repairedJson.match(/\}/g) || []).length
      var openBrackets = (repairedJson.match(/\[/g) || []).length
      var closeBrackets = (repairedJson.match(/\]/g) || []).length
      if (repairedJson.trim().endsWith(',')) {
        repairedJson = repairedJson.trim().slice(0, -1)
      }
      for (var rb = 0; rb < openBrackets - closeBrackets; rb++) repairedJson += ']'
      for (var rc = 0; rc < openBraces - closeBraces; rc++) repairedJson += '}'

      try {
        parsed = JSON.parse(repairedJson)
      } catch (repairErr) {
        $app.logger().error('PARSE_DDC: JSON parsing failed', 'raw', aiContent.substring(0, 300))
        return jsonRes(500, {
          success: false,
          error: 'Não foi possível ler o DDC. Verifique se o arquivo é um DDC válido.',
        })
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return jsonRes(500, {
        success: false,
        error: 'Não foi possível extrair os campos estruturados do DDC.',
      })
    }

    // Validação e normalização dos campos retornados
    function numOrNull(val) {
      if (val === null || val === undefined || val === '') return null
      var n = Number(val)
      return isNaN(n) ? null : n
    }

    var financedAmount = numOrNull(parsed.financed_amount)
    var installmentValue = numOrNull(parsed.installment_value)
    var installmentsTotal = numOrNull(parsed.installments_total)
    if (installmentsTotal !== null) installmentsTotal = Math.round(installmentsTotal)
    var interestRate = numOrNull(parsed.interest_rate)
    var cet = numOrNull(parsed.cet)
    var dueDay = numOrNull(parsed.due_day)
    if (dueDay !== null) {
      dueDay = Math.round(dueDay)
      if (dueDay < 1 || dueDay > 31) dueDay = null
    }
    var balanceDue = numOrNull(parsed.balance_due)

    var amortization = parsed.amortization_system
    if (amortization) {
      var amortUpper = String(amortization).toUpperCase().trim()
      if (amortUpper === 'PRICE' || amortUpper.indexOf('PRICE') !== -1) {
        amortization = 'PRICE'
      } else if (amortUpper === 'SAC' || amortUpper.indexOf('SAC') !== -1) {
        amortization = 'SAC'
      } else if (amortUpper === 'LIVRE' || amortUpper.indexOf('LIVRE') !== -1) {
        amortization = 'Livre'
      } else {
        amortization = 'Livre'
      }
    } else {
      amortization = null
    }

    var firstDueDate = parsed.first_due_date ? String(parsed.first_due_date).trim() : null
    if (firstDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
      // Tentar converter de DD/MM/YYYY
      var dmyMatch = firstDueDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (dmyMatch) {
        firstDueDate = dmyMatch[3] + '-' + dmyMatch[2] + '-' + dmyMatch[1]
      } else {
        firstDueDate = null
      }
    }

    var bankName = parsed.bank_name ? fixMojibake(String(parsed.bank_name).trim()) : null
    if (bankName && bankName.length > 100) bankName = bankName.substring(0, 100)

    var sanitizedData = {
      financed_amount: financedAmount,
      installment_value: installmentValue,
      installments_total: installmentsTotal,
      installments_paid: 0,
      interest_rate: interestRate,
      cet: cet,
      amortization_system: amortization,
      due_day: dueDay,
      first_due_date: firstDueDate,
      balance_due: balanceDue,
      bank_name: bankName,
    }

    $app.logger().info('PARSE_DDC: Sucesso', 'bank', bankName, 'installments', installmentsTotal)

    return jsonRes(200, {
      success: true,
      data: sanitizedData,
    })
  },
  $apis.requireAuth(),
)
