routerAdd(
  'POST',
  '/backend/v1/emotional-analysis',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Headers', 'authorization, content-type')

    var body = e.requestInfo().body || {}
    var familyId = body.family_id || ''
    var memberId = body.user_id || ''

    if (!familyId || !memberId) {
      return e.json(400, { error: 'Parametros obrigatorios ausentes.' })
    }

    function pad(n) {
      return n < 10 ? '0' + n : '' + n
    }

    var now = new Date()
    var ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    var startDate =
      ninetyDaysAgo.getFullYear() +
      '-' +
      pad(ninetyDaysAgo.getMonth() + 1) +
      '-' +
      pad(ninetyDaysAgo.getDate())

    var journalEntries = []
    try {
      journalEntries = $app.findRecordsByFilter(
        'emotional_journal',
        'user_id = "' + memberId + '" && created >= "' + startDate + '"',
        '-created',
        500,
        0,
      )
    } catch (_) {}

    var transactions = []
    try {
      transactions = $app.findRecordsByFilter(
        'transactions',
        'owner_id = "' + memberId + '" && transaction_date >= "' + startDate + '"',
        '-transaction_date',
        500,
        0,
      )
    } catch (_) {}

    var lines = []
    lines.push('== DIARIO EMOCIONAL (ULTIMOS 90 DIAS) ==')
    lines.push('Total de entradas: ' + journalEntries.length)
    for (var i = 0; i < journalEntries.length; i++) {
      var entry = journalEntries[i]
      lines.push(
        'Data: ' +
          entry.getString('created').substring(0, 10) +
          ' | Emocao: ' +
          entry.getString('emotion') +
          ' | Gatilho: ' +
          entry.getString('trigger') +
          ' | Valor gasto: ' +
          (entry.get('spending_amount') || 0) +
          ' | Nota: ' +
          (entry.getString('note') || ''),
      )
    }
    lines.push('')
    lines.push('== TRANSACOES (ULTIMOS 90 DIAS) ==')
    lines.push('Total de transacoes: ' + transactions.length)
    for (var j = 0; j < transactions.length; j++) {
      var tx = transactions[j]
      lines.push(
        'Data: ' +
          tx.getString('transaction_date') +
          ' | Descricao: ' +
          tx.getString('description') +
          ' | Valor: ' +
          tx.get('amount') +
          ' | Tipo: ' +
          tx.getString('type'),
      )
    }

    var contextText = lines.join('\n')

    var sysPrompt =
      'Voce e um analista comportamental especializado em psicologia financeira. Analise os dados do diario emocional e transacoes do usuario. Identifique: 1) Padroes recorrentes de gasto emocional, 2) O gatilho que mais custou dinheiro, 3) A emocao dominante, 4) Padroes de tempo/dia se possivel inferir, 5) Sugestoes praticas baseadas em Terapia Cognitivo-Comportamental (TCC). Retorne APENAS um JSON valido, sem markdown, sem texto adicional, com esta estrutura exata: {"padroes":[{"titulo":"","descricao":"","exemplos":["",""]}],"gatilho_mais_custoso":{"nome":"","total_gasto":0,"frequencia":0},"emocao_dominante":{"nome":"","frequencia":0,"impacto_financeiro":""},"sugestoes":[{"titulo":"","descricao":"","tecnica_ccb":""}]}'

    var aiMessages = [
      { role: 'system', content: sysPrompt },
      {
        role: 'user',
        content:
          'Aqui estao os dados do diario emocional e transacoes do usuario:\n\n' + contextText,
      },
    ]

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
        return e.json(503, { error: 'IA temporariamente indisponivel.' })
      }
      if (errSt === 503) return e.json(503, { error: 'IA indisponivel. Tente novamente.' })
      return e.json(500, { error: 'Erro ao processar analise.' })
    }

    var aiContent = aiResult.choices[0].message.content
    var jsonStr = aiContent
    var cbMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (cbMatch) {
      jsonStr = cbMatch[1]
    } else {
      var objS = aiContent.indexOf('{')
      var objE = aiContent.lastIndexOf('}')
      if (objS !== -1 && objE !== -1) jsonStr = aiContent.substring(objS, objE + 1)
    }

    try {
      var analysis = JSON.parse(jsonStr)
      return e.json(200, { success: true, analysis: analysis })
    } catch (_) {
      return e.json(200, {
        success: true,
        analysis: {
          padroes: [],
          gatilho_mais_custoso: { nome: '', total_gasto: 0, frequencia: 0 },
          emocao_dominante: { nome: '', frequencia: 0, impacto_financeiro: '' },
          sugestoes: [],
        },
      })
    }
  },
  $apis.requireAuth(),
)
