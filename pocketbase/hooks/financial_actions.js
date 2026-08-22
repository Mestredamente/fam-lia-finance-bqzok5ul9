// Endpoint para IA Consultora Financeira com suporte a 2 fluxos:
// 1. Fluxo de Texto: processado via $ai.chat (Skip AI Gateway)
// 2. Fluxo de Áudio (Multimodal): áudio gravado via microfone (multipart/form-data)
//    processado diretamente via Google Gemini REST API (gemini-1.5-flash) com inlineData
console.log('[financial-actions] Hook carregado e rota registrada em /backend/v1/financial-actions')
routerAdd(
  'POST',
  '/backend/v1/financial-actions',
  (e) => {
    try {
      e.response.header().set('Access-Control-Allow-Origin', '*')
      e.response.header().set('Access-Control-Allow-Headers', 'authorization, content-type')

      var reqInfo = e.requestInfo()
      var contentType =
        (reqInfo.headers && (reqInfo.headers['Content-Type'] || reqInfo.headers['content-type'])) ||
        ''
      var isMultipart = contentType.indexOf('multipart/form-data') >= 0
      console.log('[financial-actions] isMultipart:', isMultipart, 'contentType:', contentType)

      var body = reqInfo.body || {}
      // Fallback: no multipart/form-data, campos de texto podem vir em reqInfo.form
      if (isMultipart && (!body.family_id || !body.user_id)) {
        var formFields = reqInfo.form || {}
        if (formFields.family_id) body.family_id = formFields.family_id
        if (formFields.user_id) body.user_id = formFields.user_id
        if (formFields.message) body.message = formFields.message
      }

      // query params como fonte primária — PocketBase JSVM não expõe campos multipart no body
      var familyId = (reqInfo.query.family_id || body.family_id || '').trim()
      var memberId = (reqInfo.query.user_id || body.user_id || '').trim()
      console.log('[financial-actions] body keys:', Object.keys(reqInfo.body || {}))
      console.log(
        '[financial-actions] audio_base64 len:',
        (reqInfo.body?.audio_base64 || '').length,
      )
      console.log('[financial-actions] familyId:', familyId, '| memberId:', memberId)
      console.log('[financial-actions] query:', JSON.stringify(reqInfo.query))
      console.log('[financial-actions] familyId:', familyId, 'memberId:', memberId)
      var message = (body.message || '').trim()
      var context = body.context || []

      var audioFile = null
      var audioMime = 'audio/webm'
      var audioBase64 = ''

      // Plano B (JSON): áudio enviado como base64 no body quando o multipart não
      // expõe bytes no JSVM. Usa o valor diretamente e pula o findUploadedFiles.
      if (body.audio_base64) {
        audioBase64 = String(body.audio_base64).trim()
        audioMime = body.audio_mime ? String(body.audio_mime).trim() : 'audio/webm'
        console.log(
          '[financial-actions] Áudio recebido via JSON (audio_base64):',
          audioBase64.length,
          'chars',
        )
      }

      // Fluxo multipart: só tentar ler arquivos quando não há message (texto) nem
      // audio_base64 (JSON). Evita retornar erro de "áudio ausente" no fluxo de texto.
      if (!audioBase64 && !message) {
        // Áudio: sempre tentar ler — PocketBase JSVM não expõe Content-Type
        try {
          var uploadedFiles = e.findUploadedFiles('audio')
          if (uploadedFiles && uploadedFiles.length > 0) {
            audioFile = uploadedFiles[0]
          }
        } catch (fErr) {
          console.log('[financial-actions] error inspecting files:', fErr.message)
        }

        if (!audioFile) {
          console.log('Nenhum arquivo de áudio encontrado no upload')
          return e.json(200, {
            success: false,
            executable: false,
            reply: 'Arquivo de áudio não recebido. Tente gravar novamente.',
            response: 'Arquivo de áudio não recebido. Tente gravar novamente.',
            error: 'Arquivo de áudio não recebido. Tente gravar novamente.',
          })
        }

        try {
          console.log('Propriedades do audioFile:', Object.keys(audioFile))

          // Detectar mimeType
          audioMime = audioFile.type || audioFile.contentType || 'audio/webm'
          if (audioFile.header && audioFile.header.get) {
            audioMime = audioFile.header.get('Content-Type') || audioMime
          }
          if (audioFile.name) {
            var ext = audioFile.name.split('.').pop().toLowerCase()
            if (ext === 'mp4' || ext === 'm4a') audioMime = 'audio/mp4'
            else if (ext === 'wav') audioMime = 'audio/wav'
            else if (ext === 'ogg') audioMime = 'audio/ogg'
            else if (ext === 'webm') audioMime = 'audio/webm'
          }

          // Ler bytes brutos via $reader.readAll (API correta do PocketBase JSVM).
          // Os caminhos .Bytes/.bytes/.bytes()/.data não existem neste runtime.
          var rawBytes = $reader.readAll(audioFile.reader)
          console.log(
            '[financial-actions] Áudio recebido:',
            rawBytes ? rawBytes.length : 0,
            'bytes',
          )

          if (!rawBytes || !rawBytes.length) {
            console.log(
              '[financial-actions] Não conseguiu ler bytes. Keys:',
              Object.keys(audioFile),
            )
            return e.json(200, {
              success: false,
              executable: false,
              reply: 'Não consegui ler o arquivo de áudio. Tente novamente.',
              response: 'Não consegui ler o arquivo de áudio. Tente novamente.',
              error: 'Não consegui ler o arquivo de áudio. Tente novamente.',
            })
          }

          // Validação de tamanho
          if (rawBytes.length < 100) {
            return e.json(200, {
              success: false,
              executable: false,
              reply: 'O áudio é muito curto. Tente gravar por mais tempo.',
              response: 'O áudio é muito curto. Tente gravar por mais tempo.',
              error: 'O áudio é muito curto. Tente gravar por mais tempo.',
            })
          }
          if (rawBytes.length > 10 * 1024 * 1024) {
            return e.json(200, {
              success: false,
              executable: false,
              reply: 'O áudio é muito longo. Grave uma mensagem mais curta.',
              response: 'O áudio é muito longo. Grave uma mensagem mais curta.',
              error: 'O áudio é muito longo. Grave uma mensagem mais curta.',
            })
          }

          // Conversão de []byte Go para base64
          var binaryStr = ''
          for (var bi = 0; bi < rawBytes.length; bi++) {
            binaryStr += String.fromCharCode(rawBytes[bi])
          }

          if (typeof btoa === 'function') {
            audioBase64 = btoa(binaryStr)
          } else {
            var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
            var b64Parts = []
            for (var i = 0; i < rawBytes.length; i += 3) {
              var a = rawBytes[i]
              var b = i + 1 < rawBytes.length ? rawBytes[i + 1] : 0
              var c = i + 2 < rawBytes.length ? rawBytes[i + 2] : 0
              b64Parts.push(
                b64chars[a >> 2] +
                  b64chars[((a & 3) << 4) | (b >> 4)] +
                  (i + 1 < rawBytes.length ? b64chars[((b & 15) << 2) | (c >> 6)] : '=') +
                  (i + 2 < rawBytes.length ? b64chars[c & 63] : '='),
              )
            }
            audioBase64 = b64Parts.join('')
          }

          console.log('Base64 gerado:', audioBase64.length, 'chars')

          if (audioBase64.length === 0) {
            return e.json(200, {
              success: false,
              executable: false,
              reply: 'Não consegui ler o áudio. Tente gravar novamente.',
              response: 'Não consegui ler o áudio. Tente gravar novamente.',
              error: 'Não consegui ler o áudio. Tente gravar novamente.',
            })
          }
        } catch (encErr) {
          console.log('[financial-actions] error encoding audio bytes:', encErr.message)
          return e.json(200, {
            success: false,
            executable: false,
            reply: 'Não consegui ler o arquivo de áudio. Tente novamente.',
            response: 'Não consegui ler o arquivo de áudio. Tente novamente.',
            error: 'Não consegui ler o arquivo de áudio. Tente novamente.',
          })
        }
      }

      if (!familyId || !memberId || (!message && !audioBase64)) {
        return e.json(400, {
          error: 'Parâmetros obrigatórios ausentes (family_id, user_id e message/audio).',
        })
      }

      var family = null
      try {
        family = $app.findRecordById('families', familyId)
      } catch (_) {
        return e.json(404, { error: 'Família não encontrada.' })
      }

      // Rate limit: Contar ações confirmadas nas últimas 24h para esta família
      try {
        var oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ')
        var recentActions = $app.findRecordsByFilter(
          'ai_action_logs',
          'family_id = "' +
            familyId +
            '" && status = "confirmed" && created >= "' +
            oneDayAgo +
            '"',
          '-created',
          20,
          0,
        )
        if (recentActions.length >= 10) {
          return e.json(200, {
            success: false,
            error: 'Limite diário de 10 ações atingido. Tente amanhã.',
          })
        }
      } catch (rlErr) {
        console.log('[financial-actions] rate limit check error:', rlErr.message)
      }

      function fmtBRL(v) {
        return (
          'R$ ' +
          Number(v || 0)
            .toFixed(2)
            .replace('.', ',')
        )
      }

      function pad(n) {
        return n < 10 ? '0' + n : '' + n
      }

      function fmtDate(dateStr) {
        if (!dateStr) return ''
        var p = dateStr.split('-')
        if (p.length >= 3) return p[2] + '/' + p[1]
        return dateStr
      }

      var now = new Date()
      var monthNames = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ]

      var lines = []
      lines.push('== DADOS FINANCEIROS DA FAMÍLIA ==')
      lines.push('Família: ' + family.getString('name'))
      lines.push('')

      // Members
      lines.push('-- MEMBROS --')
      var members = []
      try {
        members = $app.findRecordsByFilter(
          'members',
          'family_id = "' + familyId + '"',
          'created',
          50,
          0,
        )
      } catch (_) {}
      var totalIncome = 0
      for (var mi = 0; mi < members.length; mi++) {
        var m = members[mi]
        var inc = m.get('monthly_income') || 0
        totalIncome += inc
        var memberId = m && typeof m.getId === 'function' ? m.getId() : m && m.id ? m.id : ''

        lines.push(
          m.getString('display_name') +
            ' (id: ' +
            memberId +
            ', ' +
            m.getString('role') +
            '): Renda ' +
            fmtBRL(inc) +
            '/mês',
        )
      }
      lines.push('Renda total: ' + fmtBRL(totalIncome) + '/mês')
      lines.push('')

      // Transactions (3 months)
      lines.push('-- TRANSAÇÕES (ÚLTIMOS 3 MESES) --')
      var allTx = []
      for (var ti = 0; ti < 3; ti++) {
        var d = new Date(now.getFullYear(), now.getMonth() - ti, 1)
        var startDate = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-01'
        var nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        var endDate = nextD.getFullYear() + '-' + pad(nextD.getMonth() + 1) + '-01'
        var monthLabel = monthNames[d.getMonth()] + '/' + d.getFullYear()

        var txs = []
        try {
          txs = $app.findRecordsByFilter(
            'transactions',
            'family_id = "' +
              familyId +
              '" && transaction_date >= "' +
              startDate +
              '" && transaction_date < "' +
              endDate +
              '"',
            '-transaction_date',
            200,
            0,
          )
        } catch (_) {}

        var mIncome = 0,
          mExpense = 0
        var catTotals = {}
        for (var txi = 0; txi < txs.length; txi++) {
          var tx = txs[txi]
          allTx.push(tx)
          var amt = tx.get('amount') || 0
          var txType = tx.getString('type')
          if (txType === 'income') mIncome += amt
          if (txType === 'expense') {
            mExpense += amt
            var catName = 'Sem categoria'
            try {
              var cat = $app.findRecordById('categories', tx.getString('category_id'))
              catName = cat.getString('name')
            } catch (_) {}
            if (!catTotals[catName]) catTotals[catName] = 0
            catTotals[catName] += amt
          }
        }

        lines.push(
          monthLabel +
            ': Receitas ' +
            fmtBRL(mIncome) +
            ' | Despesas ' +
            fmtBRL(mExpense) +
            ' | Saldo ' +
            fmtBRL(mIncome - mExpense),
        )
        if (ti === 0) {
          lines.push('  Despesas por categoria:')
          var catKeys = Object.keys(catTotals)
          for (var ck = 0; ck < catKeys.length; ck++) {
            lines.push('    ' + catKeys[ck] + ': ' + fmtBRL(catTotals[catKeys[ck]]))
          }
        }
      }
      lines.push('')

      // Last 10 transactions
      lines.push('-- ÚLTIMAS TRANSAÇÕES --')
      var lastTx = allTx.slice(0, 10)
      for (var lt = 0; lt < lastTx.length; lt++) {
        var t = lastTx[lt]
        var ownerName = ''
        try {
          var owner = $app.findRecordById('members', t.getString('owner_id'))
          ownerName = owner.getString('display_name')
        } catch (_) {}
        lines.push(
          fmtDate(t.getString('transaction_date')) +
            ' | ' +
            t.getString('description') +
            ' | ' +
            fmtBRL(t.get('amount')) +
            ' | ' +
            t.getString('type') +
            ' | ' +
            ownerName,
        )
      }
      lines.push('')

      // Investments
      lines.push('-- INVESTIMENTOS --')
      var investments = []
      try {
        investments = $app.findRecordsByFilter(
          'investments',
          'family_id = "' + familyId + '" && is_active = true',
          '-created',
          50,
          0,
        )
      } catch (_) {}
      var totalInvested = 0,
        totalCurrent = 0
      if (investments.length === 0) {
        lines.push('Nenhum investimento cadastrado.')
      } else {
        for (var ii = 0; ii < investments.length; ii++) {
          var inv = investments[ii]
          var invested = inv.get('amount_invested') || 0
          var current = inv.get('current_value') || 0
          totalInvested += invested
          totalCurrent += current
          var retPct = invested > 0 ? (((current - invested) / invested) * 100).toFixed(1) : '0'
          lines.push(
            inv.getString('name') +
              ' (' +
              inv.getString('type') +
              '): Investido ' +
              fmtBRL(invested) +
              ' | Atual ' +
              fmtBRL(current) +
              ' | Retorno: ' +
              retPct +
              '%',
          )
        }
      }
      lines.push(
        'Total investido: ' + fmtBRL(totalInvested) + ' | Valor atual: ' + fmtBRL(totalCurrent),
      )
      lines.push('')

      // Debts
      lines.push('-- DÍVIDAS --')
      var debts = []
      try {
        debts = $app.findRecordsByFilter(
          'debts',
          'family_id = "' + familyId + '" && is_active = true',
          '-created',
          50,
          0,
        )
      } catch (_) {}
      var totalRemaining = 0,
        totalInstallment = 0
      if (debts.length === 0) {
        lines.push('Nenhuma dívida ativa.')
      } else {
        for (var di = 0; di < debts.length; di++) {
          var debt = debts[di]
          var remaining = debt.get('remaining_amount') || 0
          var installment = debt.get('installment_value') || 0
          var remainingInst = debt.get('installments_remaining') || 0
          var rate = debt.get('interest_rate') || 0
          totalRemaining += remaining
          totalInstallment += installment
          lines.push(
            debt.getString('description') +
              ' (' +
              debt.getString('type') +
              '): Saldo ' +
              fmtBRL(remaining) +
              ' | Parcela ' +
              fmtBRL(installment) +
              ' | ' +
              remainingInst +
              'x restantes | Taxa: ' +
              rate +
              '%',
          )
        }
      }
      lines.push(
        'Total dívidas: ' + fmtBRL(totalRemaining) + ' | Parcelas/mês: ' + fmtBRL(totalInstallment),
      )
      lines.push('')

      // Credit cards
      lines.push('-- CARTÕES DE CRÉDITO --')
      var cards = []
      try {
        cards = $app.findRecordsByFilter(
          'credit_cards',
          'family_id = "' + familyId + '"',
          '-created',
          50,
          0,
        )
      } catch (_) {}
      if (cards.length === 0) {
        lines.push('Nenhum cartão cadastrado.')
      } else {
        for (var ci = 0; ci < cards.length; ci++) {
          var card = cards[ci]
          lines.push(
            card.getString('name') +
              ' (' +
              card.getString('card_brand') +
              '): Limite ' +
              fmtBRL(card.get('credit_limit')) +
              ' | Fechamento dia ' +
              card.get('closing_day') +
              ' | Vencimento dia ' +
              card.get('due_day'),
          )
        }
      }
      lines.push('')

      // Invoices current month
      lines.push('-- FATURAS DO MÊS ATUAL --')
      var curMonthStart = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-01'
      var nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      var curMonthEnd = nextMonth.getFullYear() + '-' + pad(nextMonth.getMonth() + 1) + '-01'
      var invoices = []
      try {
        invoices = $app.findRecordsByFilter(
          'invoices',
          'family_id = "' +
            familyId +
            '" && month_ref >= "' +
            curMonthStart +
            '" && month_ref < "' +
            curMonthEnd +
            '"',
          '-created',
          50,
          0,
        )
      } catch (_) {}
      if (invoices.length === 0) {
        lines.push('Nenhuma fatura no mês atual.')
      } else {
        for (var invi = 0; invi < invoices.length; invi++) {
          var inv = invoices[invi]
          var cardName = ''
          try {
            var invCard = $app.findRecordById('credit_cards', inv.getString('card_id'))
            cardName = invCard.getString('name')
          } catch (_) {}
          lines.push(
            cardName +
              ': ' +
              fmtBRL(inv.get('total_amount')) +
              ' (' +
              inv.getString('status') +
              ')',
          )
        }
      }
      lines.push('')

      // Health score (simplified)
      lines.push('-- SAÚDE FINANCEIRA --')
      var curMonthTx = []
      for (var cti = 0; cti < allTx.length; cti++) {
        var txDate = allTx[cti].getString('transaction_date')
        if (txDate >= curMonthStart && txDate < curMonthEnd) {
          curMonthTx.push(allTx[cti])
        }
      }
      var curIncome = 0,
        curExpense = 0
      for (var cti2 = 0; cti2 < curMonthTx.length; cti2++) {
        if (curMonthTx[cti2].getString('type') === 'income')
          curIncome += curMonthTx[cti2].get('amount') || 0
        if (curMonthTx[cti2].getString('type') === 'expense')
          curExpense += curMonthTx[cti2].get('amount') || 0
      }
      var balance = curIncome - curExpense
      var expPct = curIncome > 0 ? ((curExpense / curIncome) * 100).toFixed(0) : '0'
      var reserveMonths = curExpense > 0 ? (totalCurrent / curExpense).toFixed(1) : '0'
      var debtPct = totalIncome > 0 ? ((totalInstallment / totalIncome) * 100).toFixed(0) : '0'
      lines.push('Receitas do mês: ' + fmtBRL(curIncome))
      lines.push('Despesas do mês: ' + fmtBRL(curExpense))
      lines.push('Saldo do mês: ' + fmtBRL(balance))
      lines.push('Comprometimento de renda: ' + expPct + '%')
      lines.push('Reserva de emergência: ' + reserveMonths + ' meses')
      lines.push('Comprometimento com dívidas: ' + debtPct + '% da renda')
      lines.push('Patrimônio líquido: ' + fmtBRL(totalCurrent - totalRemaining))

      var contextText = lines.join('\n')

      var todayStr = now.toISOString().split('T')[0]
      var in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

      var sysPrompt =
        'Você é uma assistente financeira com capacidade de EXECUTAR ações dentro do app Família Finance. ' +
        (audioBase64
          ? 'Interprete este áudio do usuário em português do Brasil e determine a ação financeira correspondente. '
          : 'O usuário pediu: "' + message.replace(/"/g, "'") + '". ') +
        'Data atual de referência: ' +
        todayStr +
        '. Com base nos dados da família fornecidos abaixo, determine se isso corresponde a uma ação executável.\n\n' +
        'AÇÕES DISPONÍVEIS NA FASE 1:\n\n' +
        '1. create_challenge: Criar um desafio financeiro\n' +
        '   - title: string (obrigatório, máx 100 chars)\n' +
        '   - description: string (obrigatório, descreva o desafio)\n' +
        '   - target_value: number (opcional, meta em R$)\n' +
        "   - type: 'savings' | 'spending_cut' | 'no_spend' | 'custom' (obrigatório)\n" +
        '   - start_date: string ISO date YYYY-MM-DD (obrigatório, sugerir ' +
        todayStr +
        ')\n' +
        '   - end_date: string ISO date YYYY-MM-DD (obrigatório, sugerir data futura coerente como ' +
        in30Days +
        ')\n\n' +
        '2. create_task: Criar uma tarefa doméstica\n' +
        '   - title: string (obrigatório, máx 100 chars)\n' +
        '   - description: string (obrigatório, descreva a tarefa)\n' +
        "   - category: 'maintenance' | 'repair' | 'purchase' | 'appointment' | 'deadline' | 'subscription_review' | 'planning' (obrigatório)\n" +
        "   - priority: 'low' | 'medium' | 'high' | 'urgent' (obrigatório)\n" +
        '   - estimated_cost: number (opcional, em R$)\n' +
        '   - due_date: string ISO date YYYY-MM-DD (opcional)\n' +
        '   - is_recurring: boolean (opcional)\n' +
        "   - recurrence_pattern: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' (opcional, só se is_recurring=true)\n\n" +
        'REGRAS:\n' +
        '- Se o pedido do usuário for executável como uma das ações acima, retorne APENAS um JSON válido:\n' +
        '  {"executable":true,"action":"create_challenge","params":{...},"summary":"descrição amigável em português do que será criado","reply":"mensagem explicativa amigável"}\n' +
        '- Se NÃO for executável (ex: pergunta genérica, pedido de análise, dúvida), retorne APENAS um JSON válido:\n' +
        '  {"executable":false,"reply":"resposta em português explicando ou respondendo a dúvida"}\n' +
        '- Seja criativo e use os dados reais da família para sugerir valores e datas realistas\n' +
        '- SEMPRE responda em português brasileiro\n' +
        '- NUNCA invente dados que não estão no contexto\n' +
        '- Para desafios: se o usuário não especificar valor, sugira um baseado nos gastos da categoria relevante\n' +
        '- Para tarefas: se o usuário mencionar "assinaturas", analise as transações recorrentes e sugira tarefas específicas com categoria subscription_review\n' +
        '- A resposta DEVE ser APENAS o JSON, sem markdown, sem texto adicional.'

      var aiContent = ''
      var aiError = null

      if (audioBase64) {
        // Fluxo Multimodal com Áudio
        var GEMINI_API_KEY =
          $os.getenv('GEMINI_API_KEY') ||
          ($secrets.has('GEMINI_API_KEY') ? $secrets.get('GEMINI_API_KEY') : '')
        if (!GEMINI_API_KEY) {
          console.log('[financial-actions] Chave GEMINI_API_KEY não configurada')
          return e.json(200, {
            success: false,
            executable: false,
            reply: 'Não consegui processar este áudio. Tente novamente ou digite sua mensagem.',
            response: 'Não consegui processar este áudio. Tente novamente ou digite sua mensagem.',
            error: 'Chave da API Gemini não configurada para processamento de áudio.',
          })
        }

        var chosenModel = 'gemini-1.5-flash'
        var geminiUrl =
          'https://generativelanguage.googleapis.com/v1beta/models/' +
          chosenModel +
          ':generateContent'

        console.log(
          '[financial-actions] Enviando para Gemini: model=' +
            chosenModel +
            ', mimeType=' +
            audioMime,
        )

        var parts = [
          {
            inlineData: {
              mimeType: audioMime,
              data: audioBase64,
            },
          },
          {
            text:
              sysPrompt +
              '\n\nDados financeiros da família:\n\n' +
              contextText +
              '\n\nAnalise o áudio anexado e responda com o JSON solicitado.',
          },
        ]

        var geminiBody = JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        })

        for (var aRetry = 0; aRetry < 3; aRetry++) {
          try {
            var aRes = $http.send({
              url: geminiUrl,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'X-goog-api-key': GEMINI_API_KEY,
              },
              body: geminiBody,
              timeout: 60,
            })

            console.log(
              '[financial-actions] Resposta Gemini status=' +
                aRes.statusCode +
                ', body_len=' +
                (aRes.body ? aRes.body.length : 0),
            )

            if (aRes.statusCode === 200) {
              var gData = JSON.parse(aRes.body || '{}')
              if (
                gData.candidates &&
                gData.candidates[0] &&
                gData.candidates[0].content &&
                gData.candidates[0].content.parts &&
                gData.candidates[0].content.parts[0]
              ) {
                aiContent = gData.candidates[0].content.parts[0].text || ''
                aiError = null
                console.log(
                  '[financial-actions] Gemini retornou ' +
                    (aiContent ? aiContent.length : 0) +
                    ' caracteres de conteúdo',
                )
                break
              } else {
                console.log('[financial-actions] Gemini 200 mas candidates vazios:', aRes.body)
                aiError = new Error('Resposta do Gemini vazia ou sem texto.')
              }
            } else {
              console.log(
                '[financial-actions] Gemini HTTP error: status=' +
                  aRes.statusCode +
                  ', body=' +
                  aRes.body,
              )
              aiError = new Error('Gemini HTTP ' + aRes.statusCode + ': ' + aRes.body)
            }
          } catch (err) {
            console.log('[financial-actions] erro ao chamar Gemini:', err.message)
            aiError = err
          }
        }
      } else {
        // Fluxo normal de texto via $ai.chat
        var aiMessages = [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: 'Dados financeiros da família:\n\n' + contextText },
        ]

        if (context && Array.isArray(context) && context.length > 0) {
          for (var ci2 = 0; ci2 < context.length && ci2 < 10; ci2++) {
            var ctxRole = context[ci2].role === 'assistant' ? 'assistant' : 'user'
            aiMessages.push({ role: ctxRole, content: context[ci2].content || '' })
          }
        }

        aiMessages.push({ role: 'user', content: message })

        var maxRetries = 3
        for (var retry = 0; retry < maxRetries; retry++) {
          try {
            var aiResult = $ai.chat({ model: 'fast', messages: aiMessages })
            aiContent = aiResult.choices[0].message.content
            aiError = null
            break
          } catch (err) {
            aiError = err
            var errStatus = err.status || 0
            if (errStatus === 400 || errStatus === 401) break
          }
        }
      }

      if (aiError || !aiContent) {
        var errMsg = (aiError ? aiError.message : '') + ''
        var errSt = aiError && aiError.status ? aiError.status : 500
        console.log(
          '[financial-actions] Falha IA (audio=' + (audioBase64 ? 'sim' : 'não') + '):',
          errMsg,
        )

        if (audioBase64) {
          return e.json(200, {
            success: false,
            executable: false,
            reply: 'Não consegui processar este áudio. Tente novamente ou digite sua mensagem.',
            response: 'Não consegui processar este áudio. Tente novamente ou digite sua mensagem.',
            error: 'Não consegui processar este áudio. Tente novamente ou digite sua mensagem.',
          })
        }

        if (errMsg.indexOf('config') !== -1 || errMsg.indexOf('provisioned') !== -1) {
          return e.json(503, {
            error: 'IA temporariamente indisponível. Tente novamente em alguns minutos.',
          })
        }
        if (errSt === 400)
          return e.json(400, {
            error: 'Não foi possível processar sua solicitação. Verifique os dados.',
          })
        if (errSt === 401)
          return e.json(401, { error: 'Erro de autenticação com o serviço de IA.' })
        if (errSt === 503)
          return e.json(503, { error: 'IA indisponível no momento. Tente novamente.' })
        return e.json(500, { error: 'Erro ao processar com IA. Tente novamente.' })
      }

      var jsonStr = aiContent
      var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (cbMatch) {
        jsonStr = cbMatch[1]
      } else {
        var arrS = aiContent.indexOf('{')
        var arrE = aiContent.lastIndexOf('}')
        if (arrS !== -1 && arrE !== -1) jsonStr = aiContent.substring(arrS, arrE + 1)
      }

      var parsed = null
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseErr) {
        console.log('[financial-actions] JSON parse error:', parseErr.message, 'raw:', aiContent)
        // Fallback: tratar como resposta normal não-executável
        return e.json(200, {
          success: true,
          executable: false,
          response: aiContent,
          reply: aiContent,
        })
      }

      if (
        parsed &&
        parsed.executable === true &&
        (parsed.action === 'create_challenge' || parsed.action === 'create_task')
      ) {
        return e.json(200, {
          success: true,
          executable: true,
          action: parsed.action,
          params: parsed.params || {},
          summary: parsed.summary || 'Ação preparada pela assistente.',
          reply: parsed.reply || parsed.summary || 'Ação preparada pela assistente.',
        })
      } else {
        var replyText = (parsed && (parsed.reply || parsed.response)) || aiContent
        return e.json(200, {
          success: true,
          executable: false,
          response: replyText,
          reply: replyText,
        })
      }
    } catch (err) {
      console.log('[financial-actions] EXCEÇÃO:', err.message)
      console.log('[financial-actions] STACK:', err.stack)
      return e.json(500, { error: err.message, stack: err.stack })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/financial-actions/confirm',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Headers', 'authorization, content-type')

    var body = e.requestInfo().body || {}
    var action = (body.action || '').trim()
    var params = body.params || {}
    var familyId = (body.family_id || '').trim()
    var memberId = (body.user_id || '').trim()

    if (!action || !params || !familyId || !memberId) {
      return e.json(400, {
        success: false,
        error: 'Parâmetros obrigatórios ausentes (action, params, family_id, user_id).',
      })
    }

    if (action !== 'create_challenge' && action !== 'create_task') {
      return e.json(400, {
        success: false,
        error: "Ação inválida. Use 'create_challenge' ou 'create_task'.",
      })
    }

    // Validar família e membro
    try {
      $app.findRecordById('families', familyId)
    } catch (_) {
      return e.json(404, { success: false, error: 'Família não encontrada.' })
    }

    try {
      var memberRecord = $app.findRecordById('members', memberId)
      if (memberRecord.getString('family_id') !== familyId) {
        return e.json(403, { success: false, error: 'Membro não pertence à família informada.' })
      }
    } catch (_) {
      return e.json(404, { success: false, error: 'Membro não encontrado.' })
    }

    // Validações específicas da ação
    var title = (params.title || '').trim()
    var description = (params.description || '').trim()

    if (!title) {
      return e.json(400, { success: false, error: 'Título é obrigatório.' })
    }
    if (title.length > 100) {
      return e.json(400, { success: false, error: 'Título deve ter no máximo 100 caracteres.' })
    }
    if (!description) {
      return e.json(400, { success: false, error: 'Descrição é obrigatória.' })
    }

    var recordToCreate = null
    var collectionName = ''

    if (action === 'create_challenge') {
      collectionName = 'challenges'
      var validTypes = [
        'spending_freeze',
        'savings_goal',
        'no_impulse',
        'category_cut',
        'emotional_awareness',
        'custom',
      ]
      var rawType = (params.type || '').trim()

      // Map prompt shorthand to collection values
      var typeMapping = {
        savings: 'savings_goal',
        spending_cut: 'category_cut',
        no_spend: 'spending_freeze',
        custom: 'custom',
        savings_goal: 'savings_goal',
        category_cut: 'category_cut',
        spending_freeze: 'spending_freeze',
        no_impulse: 'no_impulse',
        emotional_awareness: 'emotional_awareness',
      }

      var challengeType =
        typeMapping[rawType] || (validTypes.indexOf(rawType) !== -1 ? rawType : 'custom')

      var targetValue = null
      if (
        params.target_value !== undefined &&
        params.target_value !== null &&
        params.target_value !== ''
      ) {
        var numVal = Number(params.target_value)
        if (isNaN(numVal) || numVal <= 0) {
          return e.json(400, {
            success: false,
            error: 'Valor meta deve ser um número maior que zero.',
          })
        }
        targetValue = numVal
      }

      var startDateStr = (params.start_date || '').trim()
      var endDateStr = (params.end_date || '').trim()

      if (!startDateStr) {
        startDateStr = new Date().toISOString().split('T')[0]
      }
      if (!endDateStr) {
        endDateStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      }

      var startDate = new Date(startDateStr)
      var endDate = new Date(endDateStr)

      if (isNaN(startDate.getTime())) {
        return e.json(400, { success: false, error: 'Data de início inválida.' })
      }
      if (isNaN(endDate.getTime())) {
        return e.json(400, { success: false, error: 'Data de término inválida.' })
      }

      // Validar start_date não no passado (permitir hoje considerando fuso)
      var today = new Date()
      today.setHours(0, 0, 0, 0)
      var startCheck = new Date(startDateStr)
      startCheck.setHours(0, 0, 0, 0)
      // Permitir pequena tolerância de 1 dia para evitar problemas de fuso
      var yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      if (startCheck < yesterday) {
        return e.json(400, { success: false, error: 'Data de início não pode ser no passado.' })
      }

      if (endDate <= startDate) {
        return e.json(400, {
          success: false,
          error: 'Data de término deve ser posterior à data de início.',
        })
      }

      var challengesCol = $app.findCollectionByNameOrId('challenges')
      var chRecord = new Record(challengesCol)
      chRecord.set('family_id', familyId)
      chRecord.set('user_id', memberId)
      chRecord.set('type', challengeType)
      chRecord.set('title', title)
      chRecord.set('description', description)
      if (targetValue !== null) {
        chRecord.set('target_value', targetValue)
      }
      chRecord.set('current_value', 0)
      chRecord.set('start_date', startDateStr)
      chRecord.set('end_date', endDateStr)
      chRecord.set('status', 'active')
      chRecord.set('points', 0)
      chRecord.set('badge_type', 'none')
      recordToCreate = chRecord
    } else if (action === 'create_task') {
      collectionName = 'household_tasks'
      var validCategories = [
        'maintenance',
        'repair',
        'purchase',
        'appointment',
        'deadline',
        'subscription_review',
        'planning',
        'other',
      ]
      var category = (params.category || 'other').trim()
      if (validCategories.indexOf(category) === -1) {
        category = 'other'
      }

      var validPriorities = ['low', 'medium', 'high', 'urgent']
      var priority = (params.priority || 'medium').trim()
      if (validPriorities.indexOf(priority) === -1) {
        priority = 'medium'
      }

      var estimatedCost = null
      if (
        params.estimated_cost !== undefined &&
        params.estimated_cost !== null &&
        params.estimated_cost !== ''
      ) {
        var costVal = Number(params.estimated_cost)
        if (isNaN(costVal) || costVal < 0) {
          return e.json(400, {
            success: false,
            error: 'Custo estimado deve ser um número maior ou igual a zero.',
          })
        }
        estimatedCost = costVal
      }

      var dueDateStr = (params.due_date || '').trim()
      if (dueDateStr) {
        var dueD = new Date(dueDateStr)
        if (isNaN(dueD.getTime())) {
          return e.json(400, { success: false, error: 'Data limite (due_date) inválida.' })
        }
      }

      var assignedTo = (params.assigned_to || '').trim()
      if (assignedTo) {
        try {
          var assignedMember = $app.findRecordById('members', assignedTo)
          if (assignedMember.getString('family_id') !== familyId) {
            return e.json(400, {
              success: false,
              error: 'O membro atribuído (assigned_to) não pertence a esta família.',
            })
          }
        } catch (_) {
          return e.json(400, {
            success: false,
            error: 'Membro atribuído (assigned_to) não encontrado.',
          })
        }
      }

      var isRecurring = params.is_recurring === true || params.is_recurring === 'true'
      var recurrencePattern = (params.recurrence_pattern || '').trim()
      var validPatterns = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']
      if (isRecurring && validPatterns.indexOf(recurrencePattern) === -1) {
        recurrencePattern = 'monthly'
      }

      var tasksCol = $app.findCollectionByNameOrId('household_tasks')
      var taskRecord = new Record(tasksCol)
      taskRecord.set('family_id', familyId)
      taskRecord.set('created_by', memberId)
      taskRecord.set('title', title)
      taskRecord.set('description', description)
      taskRecord.set('category', category)
      taskRecord.set('priority', priority)
      if (estimatedCost !== null) {
        taskRecord.set('estimated_cost', estimatedCost)
      }
      if (dueDateStr) {
        taskRecord.set('due_date', dueDateStr)
      }
      if (assignedTo) {
        taskRecord.set('assigned_to', assignedTo)
      }
      taskRecord.set('is_recurring', isRecurring)
      if (isRecurring && recurrencePattern) {
        taskRecord.set('recurrence_pattern', recurrencePattern)
      }
      taskRecord.set('status', 'pending')
      recordToCreate = taskRecord
    }

    var savedRecord = null
    var logCol = $app.findCollectionByNameOrId('ai_action_logs')

    try {
      $app.save(recordToCreate)
      savedRecord = recordToCreate

      // Salvar log com sucesso
      try {
        var logRecord = new Record(logCol)
        logRecord.set('family_id', familyId)
        logRecord.set('user_id', memberId)
        logRecord.set('action_type', action)
        logRecord.set('params', params)
        logRecord.set('status', 'confirmed')
        logRecord.set('created_record_id', savedRecord.getId())
        $app.save(logRecord)
      } catch (logErr) {
        console.log('[financial-actions] error saving success log:', logErr.message)
      }

      var msgSuccess =
        action === 'create_challenge' ? 'Desafio criado com sucesso!' : 'Tarefa criada com sucesso!'

      return e.json(200, {
        success: true,
        created: {
          id: savedRecord.getId(),
          title: title,
          action: action,
          collection: collectionName,
        },
        message: msgSuccess,
      })
    } catch (saveErr) {
      console.log('[financial-actions] save error:', saveErr.message)

      // Salvar log com falha
      try {
        var failLog = new Record(logCol)
        failLog.set('family_id', familyId)
        failLog.set('user_id', memberId)
        failLog.set('action_type', action)
        failLog.set('params', params)
        failLog.set('status', 'failed')
        $app.save(failLog)
      } catch (_) {}

      return e.json(500, {
        success: false,
        error:
          'Erro ao salvar ' +
          (action === 'create_challenge' ? 'desafio' : 'tarefa') +
          ': ' +
          saveErr.message,
      })
    }
  },
  $apis.requireAuth(),
)
