cronAdd('weekly_insights', '0 9 * * 6', () => {
  try {
    var families = []
    try {
      families = $app.findRecordsByFilter('families', '', 'created', 500, 0)
    } catch (err) {
      $app.logger().error('WEEKLY_INSIGHTS: erro ao buscar famílias', 'error', String(err))
      return
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var now = new Date()

    function fmtDate(d) {
      var y = d.getFullYear()
      var m = d.getMonth() + 1
      var day = d.getDate()
      return y + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (day < 10 ? '0' + day : '' + day)
    }

    var d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    var d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    var strNow = fmtDate(now)
    var str30 = fmtDate(d30)
    var str60 = fmtDate(d60)

    for (var i = 0; i < families.length; i++) {
      var family = families[i]
      if (family.get('auto_weekly_insights') === false) continue

      var familyId = family.id

      // 1. Transações dos últimos 30 dias
      var txs30 = []
      try {
        txs30 = $app.findRecordsByFilter(
          'transactions',
          'family_id = "' +
            familyId +
            '" && transaction_date >= "' +
            str30 +
            '" && transaction_date <= "' +
            strNow +
            '"',
          '-transaction_date',
          500,
          0,
        )
      } catch (_) {
        txs30 = []
      }

      // 2. Transações de 30 a 60 dias atrás
      var txs60 = []
      try {
        txs60 = $app.findRecordsByFilter(
          'transactions',
          'family_id = "' +
            familyId +
            '" && transaction_date >= "' +
            str60 +
            '" && transaction_date < "' +
            str30 +
            '"',
          '-transaction_date',
          500,
          0,
        )
      } catch (_) {
        txs60 = []
      }

      // Categorias
      var catNames = {}
      try {
        var cats = $app.findRecordsByFilter(
          'categories',
          'family_id = "' + familyId + '"',
          'name',
          100,
          0,
        )
        for (var c = 0; c < cats.length; c++) {
          catNames[cats[c].id] = cats[c].getString('name')
        }
      } catch (_) {}

      // Agrupar gastos últimos 30 dias
      var catTotals30 = {}
      var totalSpent30 = 0
      var totalIncome30 = 0
      for (var t = 0; t < txs30.length; t++) {
        var tx = txs30[t]
        var tType = tx.getString('type')
        var tAmt = tx.get('amount') || 0
        var cId = tx.getString('category_id') || 'outros'
        if (tType === 'expense') {
          totalSpent30 += tAmt
          catTotals30[cId] = (catTotals30[cId] || 0) + tAmt
        } else if (tType === 'income') {
          totalIncome30 += tAmt
        }
      }

      // Agrupar gastos período anterior
      var totalSpent60 = 0
      for (var tPrev = 0; tPrev < txs60.length; tPrev++) {
        if (txs60[tPrev].getString('type') === 'expense') {
          totalSpent60 += txs60[tPrev].get('amount') || 0
        }
      }

      var expenseVariationPct =
        totalSpent60 > 0 ? (((totalSpent30 - totalSpent60) / totalSpent60) * 100).toFixed(1) : null

      var catList = []
      var catKeys = Object.keys(catTotals30)
      for (var k = 0; k < catKeys.length; k++) {
        var cid = catKeys[k]
        catList.push({
          categoria: catNames[cid] || cid,
          total: catTotals30[cid],
        })
      }

      // Dívidas ativas
      var debts = []
      try {
        var rawDebts = $app.findRecordsByFilter(
          'debts',
          'family_id = "' + familyId + '" && is_active = true',
          'created',
          50,
          0,
        )
        for (var dIdx = 0; dIdx < rawDebts.length; dIdx++) {
          var debt = rawDebts[dIdx]
          debts.push({
            descricao: debt.getString('description'),
            saldo_restante: debt.get('remaining_amount') || 0,
            valor_parcela: debt.get('installment_value') || 0,
          })
        }
      } catch (_) {}

      // Investimentos ativos
      var investments = []
      try {
        var rawInvs = $app.findRecordsByFilter(
          'investments',
          'family_id = "' + familyId + '" && is_active = true',
          'created',
          50,
          0,
        )
        for (var invIdx = 0; invIdx < rawInvs.length; invIdx++) {
          var inv = rawInvs[invIdx]
          investments.push({
            nome: inv.getString('name'),
            valor_atual: inv.get('current_value') || 0,
            taxa: inv.get('interest_rate') || 0,
          })
        }
      } catch (_) {}

      // Desafios ativos
      var challenges = []
      try {
        var rawCh = $app.findRecordsByFilter(
          'challenges',
          'family_id = "' + familyId + '" && status = "active"',
          'created',
          20,
          0,
        )
        for (var chIdx = 0; chIdx < rawCh.length; chIdx++) {
          var ch = rawCh[chIdx]
          challenges.push({
            titulo: ch.getString('title'),
            meta: ch.get('target_value') || 0,
            atual: ch.get('current_value') || 0,
          })
        }
      } catch (_) {}

      var collectedData = {
        total_despesas_ultimos_30d: totalSpent30,
        total_receitas_ultimos_30d: totalIncome30,
        variacao_despesas_vs_anterior_pct: expenseVariationPct,
        gastos_por_categoria: catList,
        dividas_ativas: debts,
        investimentos_ativos: investments,
        desafios_ativos: challenges,
      }

      var prompt =
        'Você é uma consultora financeira. Analise os dados dos últimos 30 dias desta família e gere 3 insights acionáveis em português. Cada insight deve ter:\n' +
        "- type: 'alerta' | 'oportunidade' | 'educacao'\n" +
        '- title: título curto (máx 60 chars)\n' +
        '- description: descrição detalhada (máx 200 chars)\n' +
        "- priority: 'alta' | 'media' | 'baixa'\n" +
        '- action: recomendação prática\n' +
        'Retorne APENAS JSON: { "insights": [{ "type": "alerta", "title": "...", "description": "...", "priority": "alta", "action": "..." }] }\n' +
        'Dados: ' +
        JSON.stringify(collectedData)

      var parsedInsights = null

      try {
        var aiReply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você é uma consultora financeira experiente. Retorne sempre JSON válido no formato solicitado.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        })

        if (
          aiReply &&
          aiReply.choices &&
          aiReply.choices.length > 0 &&
          aiReply.choices[0].message
        ) {
          var content = aiReply.choices[0].message.content.trim()

          // Tentativa 1: JSON.parse direto
          try {
            var resObj = JSON.parse(content)
            if (resObj && resObj.insights && Array.isArray(resObj.insights)) {
              parsedInsights = resObj.insights
            }
          } catch (_) {}

          // Tentativa 2: Extrair bloco ```json ... ```
          if (!parsedInsights) {
            try {
              var match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
              if (match && match[1]) {
                var resObj2 = JSON.parse(match[1])
                if (resObj2 && resObj2.insights && Array.isArray(resObj2.insights)) {
                  parsedInsights = resObj2.insights
                }
              }
            } catch (_) {}
          }

          // Tentativa 3: Extrair primeiro { ... }
          if (!parsedInsights) {
            try {
              var firstBrace = content.indexOf('{')
              var lastBrace = content.lastIndexOf('}')
              if (firstBrace !== -1 && lastBrace > firstBrace) {
                var sub = content.substring(firstBrace, lastBrace + 1)
                var resObj3 = JSON.parse(sub)
                if (resObj3 && resObj3.insights && Array.isArray(resObj3.insights)) {
                  parsedInsights = resObj3.insights
                }
              }
            } catch (_) {}
          }
        }
      } catch (aiErr) {
        $app
          .logger()
          .warn('WEEKLY_INSIGHTS: IA falhou', 'family_id', familyId, 'error', String(aiErr))
      }

      if (!parsedInsights || parsedInsights.length === 0) {
        $app
          .logger()
          .info(
            'WEEKLY_INSIGHTS: Sem insights válidos da IA, pulando família',
            'family_id',
            familyId,
          )
        continue
      }

      // Máximo 3 insights
      var max3 = parsedInsights.slice(0, 3)
      for (var insIdx = 0; insIdx < max3.length; insIdx++) {
        var insight = max3[insIdx]
        if (!insight.title || !insight.description) continue

        var insTitle = String(insight.title).substring(0, 80)
        var insDesc = String(insight.description).substring(0, 300)
        var insAction = insight.action ? String(insight.action).substring(0, 200) : ''
        var insPriority = insight.priority || 'media'
        var insType = insight.type || 'educacao'

        var fullMessage = insDesc + (insAction ? ' | Ação recomendada: ' + insAction : '')

        try {
          var notif = new Record(notifCol)
          notif.set('family_id', familyId)
          notif.set('type', 'ai_insight')
          notif.set('title', insTitle)
          notif.set('message', fullMessage)
          notif.set('is_read', false)
          notif.set('metadata', {
            priority: insPriority,
            insight_type: insType,
            action: insAction,
          })
          $app.save(notif)
        } catch (saveErr) {
          $app
            .logger()
            .error(
              'WEEKLY_INSIGHTS: Erro ao salvar notificação',
              'family_id',
              familyId,
              'error',
              String(saveErr),
            )
        }
      }

      $app
        .logger()
        .info('WEEKLY_INSIGHTS: ' + max3.length + ' insights salvos', 'family_id', familyId)
    }
  } catch (err) {
    $app.logger().error('WEEKLY_INSIGHTS: Erro geral no cron', 'error', String(err))
  }
})
