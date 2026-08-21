cronAdd('bill_due_notifications', '0 8 * * *', () => {
  try {
    var families = []
    try {
      families = $app.findRecordsByFilter('families', '', 'created', 500, 0)
    } catch (err) {
      $app.logger().error('BILL_DUE_NOTIF: erro ao buscar famílias', 'error', String(err))
      return
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var now = new Date()
    var currentYear = now.getFullYear()
    var currentMonth = now.getMonth() + 1
    var currentDay = now.getDate()

    var todayMidnight = new Date(currentYear, currentMonth - 1, currentDay, 0, 0, 0)
    var todayStr =
      currentYear +
      '-' +
      (currentMonth < 10 ? '0' + currentMonth : '' + currentMonth) +
      '-' +
      (currentDay < 10 ? '0' + currentDay : '' + currentDay)

    var monthStartStr =
      currentYear + '-' + (currentMonth < 10 ? '0' + currentMonth : '' + currentMonth) + '-01'
    var nextMonthDate = new Date(currentYear, currentMonth, 1)
    var nextMonthYear = nextMonthDate.getFullYear()
    var nextMonthMonth = nextMonthDate.getMonth() + 1
    var nextMonthStartStr =
      nextMonthYear +
      '-' +
      (nextMonthMonth < 10 ? '0' + nextMonthMonth : '' + nextMonthMonth) +
      '-01'

    function formatCurrencyPtBR(num) {
      var n = Number(num) || 0
      var parts = n.toFixed(2).split('.')
      var intPart = parts[0]
      var decPart = parts[1]
      var formattedInt = ''
      for (var i = 0; i < intPart.length; i++) {
        if (i > 0 && (intPart.length - i) % 3 === 0) {
          formattedInt += '.'
        }
        formattedInt += intPart[i]
      }
      return 'R$ ' + formattedInt + ',' + decPart
    }

    function formatDateShortPtBR(dateObj) {
      var d = dateObj.getDate()
      var m = dateObj.getMonth() + 1
      return (d < 10 ? '0' + d : '' + d) + '/' + (m < 10 ? '0' + m : '' + m)
    }

    for (var f = 0; f < families.length; f++) {
      var family = families[f]
      var familyId = family.id

      // Toggle auto_budget_alert (automation toggle da família)
      if (family.get('auto_budget_alert') === false) {
        continue
      }

      // Buscar membros da família
      var members = []
      try {
        members = $app.findRecordsByFilter(
          'members',
          'family_id = "' + familyId + '" && is_active = true',
          'created',
          200,
          0,
        )
      } catch (_) {
        members = []
      }

      var membersById = {}
      for (var mi = 0; mi < members.length; mi++) {
        membersById[members[mi].id] = members[mi]
      }

      // Buscar cartões da família (para saber due_day da fatura)
      var cards = []
      try {
        cards = $app.findRecordsByFilter(
          'credit_cards',
          'family_id = "' + familyId + '" && is_active = true',
          'created',
          100,
          0,
        )
      } catch (_) {
        cards = []
      }
      var cardMap = {}
      for (var ci = 0; ci < cards.length; ci++) {
        cardMap[cards[ci].id] = cards[ci]
      }

      // Buscar transações pagas do mês atual da família (para checar se já está pago)
      var monthTxs = []
      try {
        monthTxs = $app.findRecordsByFilter(
          'transactions',
          'family_id = "' +
            familyId +
            '" && transaction_date >= "' +
            monthStartStr +
            '" && transaction_date < "' +
            nextMonthStartStr +
            '"',
          'created',
          500,
          0,
        )
      } catch (_) {
        monthTxs = []
      }

      var paidRecurringIds = {}
      var paidInvestmentIds = {}
      var paidDebtIds = {}
      var paidInvoiceIds = {}

      for (var ti = 0; ti < monthTxs.length; ti++) {
        var tx = monthTxs[ti]
        var recId = tx.getString('recurring_id')
        var invtId = tx.getString('investment_id')
        var dId = tx.getString('debt_id')
        var invId = tx.getString('invoice_id')

        if (recId) paidRecurringIds[recId] = true
        if (invtId) paidInvestmentIds[invtId] = true
        if (dId) paidDebtIds[dId] = true
        if (invId) paidInvoiceIds[invId] = true
      }

      // Buscar notificações já criadas este mês para esta família (dedup)
      var existingNotifs = []
      try {
        existingNotifs = $app.findRecordsByFilter(
          'notifications',
          'family_id = "' + familyId + '" && created >= "' + monthStartStr + ' 00:00:00"',
          'created',
          1000,
          0,
        )
      } catch (_) {
        existingNotifs = []
      }

      var notifCreatedKey = {}
      for (var ni = 0; ni < existingNotifs.length; ni++) {
        var exNotif = existingNotifs[ni]
        var nType = exNotif.getString('type')
        var meta = exNotif.get('metadata') || {}
        var originId =
          meta.origin_id ||
          meta.bill_id ||
          meta.recurring_id ||
          meta.invoice_id ||
          meta.debt_id ||
          meta.investment_id
        if (nType && originId) {
          notifCreatedKey[nType + ':' + originId] = true
        }
      }

      // Lista consolidada de contas a avaliar para a família
      var billCandidates = []

      // 1. recurring_transactions (active=true)
      var recurringList = []
      try {
        recurringList = $app.findRecordsByFilter(
          'recurring_transactions',
          'family_id = "' + familyId + '" && active = true',
          'created',
          200,
          0,
        )
      } catch (_) {
        recurringList = []
      }

      for (var ri = 0; ri < recurringList.length; ri++) {
        var rt = recurringList[ri]
        if (rt.getString('type') === 'receita') continue // Apenas contas a pagar (despesas)
        var rtDay = rt.get('day_of_month') || 1
        var rtDueDate = new Date(currentYear, currentMonth - 1, rtDay, 12, 0, 0)
        var isPaid = paidRecurringIds[rt.id] === true
        if (isPaid) continue

        billCandidates.push({
          source: 'recurring',
          origin_id: rt.id,
          member_id: rt.getString('member_id'),
          description: rt.getString('description') || 'Conta recorrente',
          amount: rt.get('amount') || 0,
          due_date: rtDueDate,
        })
      }

      // 2. investments (is_active=true com parcelas pendentes)
      var investmentsList = []
      try {
        investmentsList = $app.findRecordsByFilter(
          'investments',
          'family_id = "' + familyId + '" && is_active = true',
          'created',
          200,
          0,
        )
      } catch (_) {
        investmentsList = []
      }

      for (var ii = 0; ii < investmentsList.length; ii++) {
        var invItem = investmentsList[ii]
        var invTotal = invItem.get('installments_total') || 0
        var invPaid = invItem.get('installments_paid') || 0
        if (invTotal <= 0 || invPaid >= invTotal) continue
        var invDueDay = invItem.get('installment_due_day')
        if (!invDueDay || invDueDay < 1 || invDueDay > 31) continue
        var invDueDate = new Date(currentYear, currentMonth - 1, invDueDay, 12, 0, 0)
        var isInvPaid =
          paidInvestmentIds[invItem.id] === true || invItem.getString('status') === 'paid_off'
        if (isInvPaid) continue

        billCandidates.push({
          source: 'investment',
          origin_id: invItem.id,
          member_id: invItem.getString('owner_id'),
          description: invItem.getString('name') || 'Investimento',
          amount: invItem.get('installment_value') || invItem.get('amount_invested') || 0,
          due_date: invDueDate,
        })
      }

      // 3. debts (is_active=true)
      var debtsList = []
      try {
        debtsList = $app.findRecordsByFilter(
          'debts',
          'family_id = "' + familyId + '" && is_active = true',
          'created',
          200,
          0,
        )
      } catch (_) {
        debtsList = []
      }

      for (var di = 0; di < debtsList.length; di++) {
        var debtItem = debtsList[di]
        var dTotal = debtItem.get('installments_total') || 0
        var dPaid = debtItem.get('installments_paid') || 0
        if (debtItem.getString('status') === 'paid_off' || (dTotal > 0 && dPaid >= dTotal)) continue
        var dDueDay = debtItem.get('due_day')
        if (!dDueDay || dDueDay < 1 || dDueDay > 31) continue
        var dDueDate = new Date(currentYear, currentMonth - 1, dDueDay, 12, 0, 0)
        var isDebtPaid = paidDebtIds[debtItem.id] === true
        if (isDebtPaid) continue

        billCandidates.push({
          source: 'debt',
          origin_id: debtItem.id,
          member_id: debtItem.getString('owner_id'),
          description: debtItem.getString('description') || 'Dívida',
          amount: debtItem.get('installment_value') || 0,
          due_date: dDueDate,
        })
      }

      // 4. invoices (status != 'paid')
      var invoicesList = []
      try {
        invoicesList = $app.findRecordsByFilter(
          'invoices',
          'family_id = "' + familyId + '" && status != "paid"',
          'created',
          200,
          0,
        )
      } catch (_) {
        invoicesList = []
      }

      for (var vi = 0; vi < invoicesList.length; vi++) {
        var invRec = invoicesList[vi]
        var invAmount = invRec.get('total_amount') || 0
        if (invAmount <= 0) continue
        var isInvoicePaid = paidInvoiceIds[invRec.id] === true
        if (isInvoicePaid) continue

        var cardObj = cardMap[invRec.getString('card_id')]
        var cardDueDay = cardObj ? cardObj.get('due_day') : null
        var monthRefStr = (invRec.getString('month_ref') || '').split(' ')[0].split('T')[0]
        if (!monthRefStr) continue
        var mRefDate = new Date(monthRefStr + 'T12:00:00')
        if (isNaN(mRefDate.getTime())) continue

        var finalDueDay =
          cardDueDay && cardDueDay >= 1 && cardDueDay <= 31 ? cardDueDay : mRefDate.getDate()
        var invoiceDueDate = new Date(
          mRefDate.getFullYear(),
          mRefDate.getMonth(),
          finalDueDay,
          12,
          0,
          0,
        )
        var cardName = cardObj ? cardObj.getString('name') : 'Cartão'

        billCandidates.push({
          source: 'invoice',
          origin_id: invRec.id,
          member_id: invRec.getString('owner_id'),
          description: 'Fatura ' + cardName,
          amount: invAmount,
          due_date: invoiceDueDate,
        })
      }

      // Agora processar cada conta candidata
      for (var bi = 0; bi < billCandidates.length; bi++) {
        var bill = billCandidates[bi]
        var bMember = bill.member_id ? membersById[bill.member_id] : null
        var userId = null

        // Verificar notify_bills do membro owner
        if (bMember) {
          if (bMember.get('notify_bills') === false) {
            continue
          }
          userId = bMember.getString('user_id') || null
        }

        var bDue = bill.due_date
        var bDueMidnight = new Date(bDue.getFullYear(), bDue.getMonth(), bDue.getDate(), 0, 0, 0)
        var diffMs = bDueMidnight.getTime() - todayMidnight.getTime()
        var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

        var notifType = null
        var notifTitle = ''
        var notifMessage = ''

        if (diffDays >= 0 && diffDays <= 3) {
          // Vencendo hoje ou nos próximos 3 dias
          notifType = 'bill_due'
          var dateLabel = formatDateShortPtBR(bDue)
          notifTitle = 'Vencimento: ' + bill.description + ' — ' + dateLabel
          var daysText =
            diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : 'em ' + diffDays + ' dias'
          notifMessage =
            'A conta ' +
            bill.description +
            ' de ' +
            formatCurrencyPtBR(bill.amount) +
            ' vence ' +
            daysText +
            ' (' +
            dateLabel +
            ').'
        } else if (diffDays < 0) {
          // Vencida
          notifType = 'bill_overdue'
          var overdueDays = Math.abs(diffDays)
          notifTitle =
            'Conta vencida: ' +
            bill.description +
            ' — ' +
            overdueDays +
            (overdueDays === 1 ? ' dia em atraso' : ' dias em atraso')
          notifMessage =
            'A conta ' +
            bill.description +
            ' no valor de ' +
            formatCurrencyPtBR(bill.amount) +
            ' está vencida há ' +
            overdueDays +
            (overdueDays === 1 ? ' dia' : ' dias') +
            '.'
        }

        if (!notifType) continue

        // Verificar duplicata no mês
        var dedupKey = notifType + ':' + bill.origin_id
        if (notifCreatedKey[dedupKey]) {
          continue
        }

        try {
          var newNotif = new Record(notifCol)
          newNotif.set('family_id', familyId)
          if (userId) newNotif.set('user_id', userId)
          newNotif.set('type', notifType)
          newNotif.set('title', notifTitle)
          newNotif.set('message', notifMessage)
          newNotif.set('is_read', false)
          newNotif.set('metadata', {
            origin_id: bill.origin_id,
            source: bill.source,
            amount: bill.amount,
            due_date: bDue.toISOString(),
            diff_days: diffDays,
          })

          $app.save(newNotif)
          notifCreatedKey[dedupKey] = true

          $app
            .logger()
            .info(
              'BILL_DUE_NOTIF: Notificação criada',
              'type',
              notifType,
              'origin_id',
              bill.origin_id,
              'family_id',
              familyId,
            )
        } catch (saveErr) {
          $app
            .logger()
            .error(
              'BILL_DUE_NOTIF: Erro ao salvar notificação',
              'error',
              String(saveErr),
              'origin_id',
              bill.origin_id,
            )
        }
      }
    }
  } catch (err) {
    $app.logger().error('BILL_DUE_NOTIF: Erro geral no cron', 'error', String(err))
  }
})
