cronAdd('weekly_financial_summary', '0 20 * * 0', () => {
  try {
    var families = []
    try {
      families = $app.findRecordsByFilter('families', '', 'created', 500, 0)
    } catch (err) {
      $app.logger().error('WEEKLY_SUMMARY: erro ao buscar famílias', 'error', String(err))
      return
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var now = new Date()

    // 7 dias atrás
    var d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    var d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    function fmtDate(d) {
      var y = d.getFullYear()
      var m = d.getMonth() + 1
      var day = d.getDate()
      return y + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (day < 10 ? '0' + day : '' + day)
    }

    function fmtBR(d) {
      var day = d.getDate()
      var m = d.getMonth() + 1
      return (day < 10 ? '0' + day : '' + day) + '/' + (m < 10 ? '0' + m : '' + m)
    }

    var strNow = fmtDate(now)
    var str7 = fmtDate(d7)
    var str14 = fmtDate(d14)
    var labelPeriod = fmtBR(d7) + ' a ' + fmtBR(now)

    for (var i = 0; i < families.length; i++) {
      var family = families[i]
      var autoSummary = family.get('auto_weekly_summary')
      if (autoSummary === false) continue

      var familyId = family.id

      // 1. Transações dos últimos 7 dias (str7 a strNow)
      var txsCurrent = []
      try {
        txsCurrent = $app.findRecordsByFilter(
          'transactions',
          'family_id = "' +
            familyId +
            '" && transaction_date >= "' +
            str7 +
            '" && transaction_date <= "' +
            strNow +
            '"',
          '-transaction_date',
          500,
          0,
        )
      } catch (_) {
        txsCurrent = []
      }

      // 2. Transações dos 7 a 14 dias atrás para comparação
      var txsPrevious = []
      try {
        txsPrevious = $app.findRecordsByFilter(
          'transactions',
          'family_id = "' +
            familyId +
            '" && transaction_date >= "' +
            str14 +
            '" && transaction_date < "' +
            str7 +
            '"',
          '-transaction_date',
          500,
          0,
        )
      } catch (_) {
        txsPrevious = []
      }

      var totalReceitas = 0
      var totalDespesas = 0
      var categoryExpenses = {}
      var txsAbove500 = []

      for (var j = 0; j < txsCurrent.length; j++) {
        var tx = txsCurrent[j]
        var type = tx.getString('type')
        var amount = tx.get('amount') || 0
        var desc = tx.getString('description')
        var catId = tx.getString('category_id') || 'sem_categoria'
        var tDate = tx.getString('transaction_date')

        if (type === 'income') {
          totalReceitas += amount
        } else if (type === 'expense') {
          totalDespesas += amount
          categoryExpenses[catId] = (categoryExpenses[catId] || 0) + amount
          if (amount >= 500) {
            txsAbove500.push({ description: desc, amount: amount, date: tDate })
          }
        }
      }

      var prevDespesas = 0
      for (var k = 0; k < txsPrevious.length; k++) {
        var ptx = txsPrevious[k]
        if (ptx.getString('type') === 'expense') {
          prevDespesas += ptx.get('amount') || 0
        }
      }

      // Buscar nomes de categorias
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

      // Top 3 categorias
      var catKeys = Object.keys(categoryExpenses)
      catKeys.sort(function (a, b) {
        return categoryExpenses[b] - categoryExpenses[a]
      })

      var top3Cats = []
      for (var tc = 0; tc < Math.min(3, catKeys.length); tc++) {
        var cid = catKeys[tc]
        top3Cats.push({
          categoria: catNames[cid] || cid,
          total: categoryExpenses[cid],
        })
      }

      var saldoSemana = totalReceitas - totalDespesas
      var variacaoDespesas =
        prevDespesas > 0 ? (((totalDespesas - prevDespesas) / prevDespesas) * 100).toFixed(1) : null

      var summaryData = {
        periodo: labelPeriod,
        receitas: totalReceitas,
        despesas: totalDespesas,
        saldo: saldoSemana,
        despesas_semana_anterior: prevDespesas,
        variacao_despesas_pct: variacaoDespesas,
        top_3_categorias: top3Cats,
        transacoes_relevantes: txsAbove500,
      }

      var messageText = ''
      var geminiSuccess = false

      try {
        var prompt =
          'Gere um resumo financeiro semanal em português, amigável e motivacional, máximo 200 palavras.\n' +
          'Inclua: saudação personalizada, destaque positivo (se houver), alerta (se houver preocupação), ' +
          'uma dica acionável para a próxima semana.\n' +
          'Dados: ' +
          JSON.stringify(summaryData)

        var aiReply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content: 'Você é a consultora financeira inteligente do aplicativo Família Finance.',
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
          messageText = aiReply.choices[0].message.content.trim()
          if (messageText.length > 10) {
            geminiSuccess = true
          }
        }
      } catch (aiErr) {
        $app
          .logger()
          .warn(
            'WEEKLY_SUMMARY: IA falhou, usando fallback',
            'family_id',
            familyId,
            'error',
            String(aiErr),
          )
      }

      // Fallback sem IA
      if (!geminiSuccess || !messageText) {
        var topCatsStr = top3Cats
          .map(function (c) {
            return c.categoria + ': R$ ' + c.total.toFixed(2)
          })
          .join(', ')
        if (!topCatsStr) topCatsStr = 'Nenhum gasto registrado'

        messageText =
          'Receitas: R$ ' +
          totalReceitas.toFixed(2) +
          ' | Despesas: R$ ' +
          totalDespesas.toFixed(2) +
          ' | Saldo: R$ ' +
          saldoSemana.toFixed(2) +
          ' | Top gastos: ' +
          topCatsStr
      }

      try {
        var notif = new Record(notifCol)
        notif.set('family_id', familyId)
        notif.set('type', 'weekly_summary')
        notif.set('title', 'Resumo Semanal — ' + labelPeriod)
        notif.set('message', messageText)
        notif.set('is_read', false)
        notif.set('metadata', {
          period: labelPeriod,
          total_income: totalReceitas,
          total_expense: totalDespesas,
          balance: saldoSemana,
          gemini: geminiSuccess,
        })
        $app.save(notif)
        $app.logger().info('WEEKLY_SUMMARY: Notificação criada com sucesso', 'family_id', familyId)
      } catch (saveErr) {
        $app
          .logger()
          .error(
            'WEEKLY_SUMMARY: Erro ao salvar notificação',
            'family_id',
            familyId,
            'error',
            String(saveErr),
          )
      }
    }
  } catch (err) {
    $app.logger().error('WEEKLY_SUMMARY: Erro geral no cron', 'error', String(err))
  }
})
