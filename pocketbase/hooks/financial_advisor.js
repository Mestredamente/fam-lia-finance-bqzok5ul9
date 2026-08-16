routerAdd(
  'POST',
  '/backend/v1/financial-advisor',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Headers', 'authorization, content-type')

    var body = e.requestInfo().body || {}
    var familyId = body.family_id || ''
    var memberId = body.user_id || ''
    var reqType = body.type || ''
    var message = body.message || ''
    var context = body.context || []

    if (!familyId || !memberId || !reqType) {
      return e.json(400, { error: 'Parâmetros obrigatórios ausentes.' })
    }
    if (reqType !== 'chat' && reqType !== 'insights' && reqType !== 'emotional_insights') {
      return e.json(400, {
        error: 'Tipo inválido. Use "chat", "insights" ou "emotional_insights".',
      })
    }

    var family = null
    try {
      family = $app.findRecordById('families', familyId)
    } catch (_) {
      return e.json(404, { error: 'Família não encontrada.' })
    }

    // ---- emotional_insights: context comes pre-aggregated from the frontend ----
    // Does NOT need the full family financial snapshot. Falls back to an empty
    // insights array on any AI failure so the frontend can use static fallback.
    if (reqType === 'emotional_insights') {
      var emoContext = body.context || null
      if (!emoContext || typeof emoContext !== 'object') {
        return e.json(200, { success: true, insights: [] })
      }

      var emoPrompt =
        'Você é um consultor financeiro comportamental especializado em psicologia do consumo. Analise os padrões emocionais de gasto desta família no mês e gere EXATAMENTE 3 insights. Diretrizes:\n\nContexto (dados agregados enviados pelo frontend em JSON):\n' +
        JSON.stringify(emoContext) +
        '\n\nREGRAS:\n' +
        "1. CADA insight deve ser um objeto com: titulo (5-8 palavras), descricao (1-2 frases, máx 150 caracteres), tipo ('alerta' | 'oportunidade' | 'educacao' | 'comportamento')\n" +
        '2. O insight DEVE ser específico aos dados fornecidos — NUNCA genérico\n' +
        "3. Tom: empático, não-julgador, motivacional. Use 'você' e verbos no presente.\n" +
        '4. Foque em PADRÕES e RECOMENDAÇÕES PRÁTICAS\n' +
        '5. Se um dado não estiver no contexto, NÃO o invente\n' +
        '6. Se não houver dados suficientes (menos de 5 transações), gere apenas 1 insight genérico incentivando o registro de emoções\n\n' +
        'Exemplos de bons insights:\n' +
        '- "Suas noites de sexta têm o dobro de gastos — R$ 520 em delivery. Que tal um jantar especial em casa uma vez por mês? Sua carteira e seu paladar agradecem."\n' +
        '- "Metade dos seus gastos impulsivos acontece à tarde. Tente esperar 30 minutos antes de finalizar compras online nesse período."\n\n' +
        'Responda APENAS com o JSON array: [{"titulo":"...","descricao":"...","tipo":"..."}, ...]'

      var emoMessages = [
        { role: 'system', content: emoPrompt },
        { role: 'user', content: 'Gere os insights com base no contexto fornecido.' },
      ]

      var emoResult = null
      var emoError = null
      try {
        emoResult = $ai.chat({ model: 'fast', messages: emoMessages })
      } catch (err) {
        emoError = err
      }

      if (emoError || !emoResult || !emoResult.choices || !emoResult.choices[0]) {
        return e.json(200, { success: true, insights: [] })
      }

      var emoContent = emoResult.choices[0].message.content
      var emoJsonStr = emoContent
      var emoCbMatch = emoContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (emoCbMatch) {
        emoJsonStr = emoCbMatch[1]
      } else {
        var emoArrS = emoContent.indexOf('[')
        var emoArrE = emoContent.lastIndexOf(']')
        if (emoArrS !== -1 && emoArrE !== -1)
          emoJsonStr = emoContent.substring(emoArrS, emoArrE + 1)
      }

      try {
        var emoInsights = JSON.parse(emoJsonStr)
        if (!Array.isArray(emoInsights)) emoInsights = []
        // Normalize: ensure prioridade + acao_recomendada defaults so the
        // response matches the AIInsight shape used by type:'insights'.
        for (var ei = 0; ei < emoInsights.length; ei++) {
          if (!emoInsights[ei].prioridade) emoInsights[ei].prioridade = 'media'
          if (!emoInsights[ei].acao_recomendada) emoInsights[ei].acao_recomendada = ''
          if (
            emoInsights[ei].tipo !== 'alerta' &&
            emoInsights[ei].tipo !== 'oportunidade' &&
            emoInsights[ei].tipo !== 'educacao' &&
            emoInsights[ei].tipo !== 'comportamento'
          ) {
            emoInsights[ei].tipo = 'comportamento'
          }
        }
        return e.json(200, { success: true, insights: emoInsights })
      } catch (_) {
        return e.json(200, { success: true, insights: [] })
      }
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
      lines.push(
        m.getString('display_name') +
          ' (' +
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
          cardName + ': ' + fmtBRL(inv.get('total_amount')) + ' (' + inv.getString('status') + ')',
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

    var sysPrompt = ''
    if (reqType === 'insights') {
      sysPrompt =
        'Você é uma consultora financeira brasileira especializada em finanças familiares. Analise os dados financeiros abaixo e gere de 3 a 5 insights acionáveis em português brasileiro. Cada insight deve ter: titulo (curto e direto), descricao (explicação detalhada), tipo (alerta, oportunidade, educacao ou comportamento), prioridade (alta, media ou baixa), acao_recomendada (passo prático). Retorne APENAS um array JSON válido, sem markdown, sem texto adicional. Formato: [{"titulo":"...","descricao":"...","tipo":"...","prioridade":"...","acao_recomendada":"..."}]'
    } else {
      sysPrompt =
        'Você é uma consultora financeira brasileira especializada em finanças familiares. Responda em português brasileiro, de forma clara e prática. Baseie-se APENAS nos dados financeiros reais fornecidos no contexto. Não recomende produtos financeiros específicos. Se não houver dados suficientes, oriente o usuário a cadastrar mais informações. Use formatação markdown simples (negrito com **texto**, listas com - item).'
    }

    var aiMessages = [{ role: 'system', content: sysPrompt }]
    aiMessages.push({
      role: 'user',
      content: 'Aqui estão os dados financeiros da família:\n\n' + contextText,
    })

    if (reqType === 'chat') {
      if (context && context.length > 0) {
        for (var ci2 = 0; ci2 < context.length && ci2 < 20; ci2++) {
          var ctxRole = context[ci2].role === 'assistant' ? 'assistant' : 'user'
          aiMessages.push({ role: ctxRole, content: context[ci2].content || '' })
        }
      }
      if (message) {
        aiMessages.push({ role: 'user', content: message })
      } else {
        return e.json(400, { error: 'Mensagem é obrigatória para o tipo chat.' })
      }
    }

    var maxRetries = 3
    var aiResult = null
    var aiError = null
    for (var retry = 0; retry < maxRetries; retry++) {
      try {
        aiResult = $ai.chat({ model: 'fast', messages: aiMessages })
        aiError = null
        break
      } catch (err) {
        aiError = err
        var errStatus = err.status || 0
        if (errStatus === 400 || errStatus === 401) break
      }
    }

    if (aiError) {
      var errMsg = (aiError.message || '') + ''
      var errSt = aiError.status || 500
      if (errMsg.indexOf('config') !== -1 || errMsg.indexOf('provisioned') !== -1) {
        return e.json(503, {
          error: 'IA temporariamente indisponível. Tente novamente em alguns minutos.',
        })
      }
      if (errSt === 400)
        return e.json(400, {
          error: 'Não foi possível processar sua solicitação. Verifique os dados.',
        })
      if (errSt === 401) return e.json(401, { error: 'Erro de autenticação com o serviço de IA.' })
      if (errSt === 503)
        return e.json(503, { error: 'IA indisponível no momento. Tente novamente.' })
      return e.json(500, { error: 'Erro ao processar com IA. Tente novamente.' })
    }

    var aiContent = aiResult.choices[0].message.content

    if (reqType === 'insights') {
      var jsonStr = aiContent
      var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (cbMatch) {
        jsonStr = cbMatch[1]
      } else {
        var arrS = aiContent.indexOf('[')
        var arrE = aiContent.lastIndexOf(']')
        if (arrS !== -1 && arrE !== -1) jsonStr = aiContent.substring(arrS, arrE + 1)
      }
      try {
        var insights = JSON.parse(jsonStr)
        if (!Array.isArray(insights)) insights = []
        return e.json(200, { success: true, insights: insights })
      } catch (_) {
        return e.json(200, { success: true, insights: [] })
      }
    } else {
      return e.json(200, { success: true, response: aiContent })
    }
  },
  $apis.requireAuth(),
)
