cronAdd('generate_recurring_transactions', '0 0 * * *', () => {
  try {
    var now = new Date()
    var y = now.getFullYear()
    var m = now.getMonth() + 1
    var monthStr = m < 10 ? '0' + m : '' + m
    var d = now.getDate()
    var dayStr = d < 10 ? '0' + d : '' + d
    var todayStr = y + '-' + monthStr + '-' + dayStr

    var nextMonthDate = new Date(y, now.getMonth() + 1, 1)
    var endY = nextMonthDate.getFullYear()
    var endM = nextMonthDate.getMonth() + 1
    var endMonthStr = endM < 10 ? '0' + endM : '' + endM
    var endOfMonthStr = endY + '-' + endMonthStr + '-01'

    var debts = []
    try {
      debts = $app.findRecordsByFilter(
        'debts',
        "status = 'active' && auto_create_transaction = true && is_active = true",
        'created',
        500,
        0,
      )
    } catch (_) {
      return
    }

    var txCol = $app.findCollectionByNameOrId('transactions')
    var createdCount = 0

    for (var i = 0; i < debts.length; i++) {
      var debt = debts[i]
      var debtId = debt.id
      var familyId = debt.getString('family_id')
      var ownerId = debt.getString('owner_id')
      var description = debt.getString('description')
      var installmentValue = debt.get('installment_value') || 0
      var categoryId = debt.getString('category_id') || ''
      var installmentsTotal = debt.get('installments_total') || 0
      var installmentsPaid = debt.get('installments_paid') || 0

      if (installmentsTotal > 0 && installmentsPaid >= installmentsTotal) {
        debt.set('status', 'paid_off')
        debt.set('is_active', false)
        $app.save(debt)
        continue
      }

      var existing = []
      try {
        existing = $app.findRecordsByFilter(
          'transactions',
          'debt_id = "' +
            debtId +
            '" && transaction_date >= "' +
            todayStr.substring(0, 8) +
            '01" && transaction_date < "' +
            endOfMonthStr +
            '"',
          'created',
          1,
          0,
        )
      } catch (_) {}

      if (existing.length > 0) continue

      var tx = new Record(txCol)
      tx.set('family_id', familyId)
      tx.set('owner_id', ownerId)
      if (categoryId) tx.set('category_id', categoryId)
      tx.set('type', 'expense')
      tx.set('amount', installmentValue)
      tx.set('description', description)
      tx.set('transaction_date', todayStr)
      tx.set('is_shared', false)
      tx.set('is_fixed', true)
      tx.set('source', 'recurring_debt')
      tx.set('debt_id', debtId)
      tx.set('status', 'pending')

      try {
        $app.save(tx)
        createdCount++

        var newPaid = installmentsPaid + 1
        var newRemaining = Math.max(0, installmentsTotal - newPaid)
        var newRemainingAmount = Math.max(0, (debt.get('remaining_amount') || 0) - installmentValue)

        debt.set('installments_paid', newPaid)
        debt.set('installments_remaining', newRemaining)
        debt.set('remaining_amount', newRemainingAmount)

        if (installmentsTotal > 0 && newPaid >= installmentsTotal) {
          debt.set('status', 'paid_off')
          debt.set('is_active', false)
        }

        $app.save(debt)

        $app
          .logger()
          .info(
            'RECURRING: criada transação para dívida ' +
              description +
              ' - parcela ' +
              newPaid +
              '/' +
              installmentsTotal,
          )
      } catch (saveErr) {
        $app
          .logger()
          .error(
            'RECURRING: erro ao criar transação para dívida ' + description,
            'error',
            String(saveErr),
          )
      }
    }

    // === NOVO: processar recurring_transactions (contas fixas mensais/semanais/anuais) ===
    // Separado das dívidas acima: transações de debts usam source='recurring_debt' + debt_id;
    // as recorrentes usam source='recurring' + recurring_id.
    var recurringTxs = []
    try {
      recurringTxs = $app.findRecordsByFilter(
        'recurring_transactions',
        'active = true',
        'created',
        500,
        0,
      )
    } catch (_) {
      recurringTxs = []
    }

    var recurringCreatedCount = 0

    for (var j = 0; j < recurringTxs.length; j++) {
      var rt = recurringTxs[j]
      var rtDay = rt.get('day_of_month') || 1
      var rtFreq = rt.getString('frequency') || 'monthly'

      // Verificar se deve gerar hoje baseado na frequência
      var shouldGenerate = false
      if (rtFreq === 'monthly' && rtDay === d) {
        shouldGenerate = true
      } else if (rtFreq === 'weekly') {
        // Gerar se hoje é o mesmo dia da semana da data de início (start_date)
        var startDateW = new Date(rt.getString('start_date') + 'T00:00:00')
        shouldGenerate = now.getDay() === startDateW.getDay()
      } else if (rtFreq === 'yearly') {
        var startDateY = new Date(rt.getString('start_date') + 'T00:00:00')
        shouldGenerate = m === startDateY.getMonth() + 1 && d === startDateY.getDate()
      }

      // Verificar end_date
      var endStr2 = rt.getString('end_date')
      if (endStr2) {
        var endDate2 = new Date(endStr2 + 'T23:59:59')
        if (now > endDate2) continue
      }

      // Verificar start_date (não gerar antes do início)
      var startStr2 = rt.getString('start_date')
      if (startStr2) {
        var startDateCheck = new Date(startStr2 + 'T00:00:00')
        if (now < startDateCheck) continue
      }

      if (!shouldGenerate) continue

      // Verificar se já existe transação neste mês com este recurring_id
      var rtId = rt.id
      var existing2 = []
      try {
        existing2 = $app.findRecordsByFilter(
          'transactions',
          'recurring_id = "' +
            rtId +
            '" && transaction_date >= "' +
            todayStr.substring(0, 8) +
            '01" && transaction_date < "' +
            endOfMonthStr +
            '"',
          'created',
          1,
          0,
        )
      } catch (_) {}

      if (existing2.length > 0) continue

      // Criar transação
      var tx2 = new Record(txCol)
      tx2.set('family_id', rt.getString('family_id'))
      tx2.set('owner_id', rt.getString('member_id'))
      if (rt.getString('category_id')) tx2.set('category_id', rt.getString('category_id'))
      tx2.set('type', rt.getString('type') === 'receita' ? 'income' : 'expense')
      tx2.set('amount', rt.get('amount') || 0)
      tx2.set('description', rt.getString('description'))
      tx2.set('transaction_date', todayStr)
      tx2.set('is_shared', rt.get('shared') || false)
      tx2.set('is_fixed', true)
      tx2.set('source', 'recurring')
      tx2.set('recurring_id', rtId)
      tx2.set('status', 'pending')
      // Mapear emoção (PT no recorrente -> EN no transaction select)
      var rtEmotion = rt.getString('emotion')
      if (rtEmotion) {
        var emotionMap = {
          feliz: 'happy',
          necessario: 'necessary',
          neutro: 'neutral',
          arrependido: 'regret',
          impulsivo: 'impulsive',
          ansioso: 'anxious',
        }
        var mappedEmotion = emotionMap[rtEmotion]
        if (mappedEmotion) tx2.set('emotion', mappedEmotion)
      }

      try {
        $app.save(tx2)
        recurringCreatedCount++
        $app
          .logger()
          .info(
            'RECURRING: criada transação para recorrente ' + rt.getString('description'),
            'frequency',
            rtFreq,
          )
      } catch (saveErr2) {
        $app
          .logger()
          .error(
            'RECURRING: erro ao criar transação para recorrente ' + rt.getString('description'),
            'error',
            String(saveErr2),
          )
      }
    }

    // === NOVO: processar investimentos parcelados ===
    // Gera a transação da parcela mensal de investimentos ativos parcelados,
    // no dia de vencimento (installment_due_day), respeitando installment_start_date.
    var investments = []
    try {
      investments = $app.findRecordsByFilter(
        'investments',
        'is_active = true && installments_total > 1 && installments_paid < installments_total && installment_due_day = ' +
          d,
        'created',
        500,
        0,
      )
    } catch (_) {
      investments = []
    }

    var investmentCreatedCount = 0

    for (var k = 0; k < investments.length; k++) {
      var inv = investments[k]
      var invId = inv.id
      var invName = inv.getString('name')
      var invInstallmentValue = inv.get('installment_value') || 0
      var invInstallmentsTotal = inv.get('installments_total') || 0
      var invInstallmentsPaid = inv.get('installments_paid') || 0
      var invCategoryId = inv.getString('expense_category_id') || ''
      var invFamilyId = inv.getString('family_id')
      var invOwnerId = inv.getString('owner_id')

      // Não gerar antes do início do parcelamento
      var invStartStr = inv.getString('installment_start_date')
      if (invStartStr) {
        var invStartDate = new Date(invStartStr)
        if (invStartDate.getTime() > now.getTime()) continue
      }

      // Verificar se já existe transação no mês atual com este investment_id
      var existingInv = []
      try {
        existingInv = $app.findRecordsByFilter(
          'transactions',
          'investment_id = "' +
            invId +
            '" && transaction_date >= "' +
            todayStr.substring(0, 8) +
            '01" && transaction_date < "' +
            endOfMonthStr +
            '"',
          'created',
          1,
          0,
        )
      } catch (_) {}

      if (existingInv.length > 0) continue

      var invNextPaid = invInstallmentsPaid + 1
      var tx3 = new Record(txCol)
      tx3.set('family_id', invFamilyId)
      tx3.set('owner_id', invOwnerId)
      if (invCategoryId) tx3.set('category_id', invCategoryId)
      tx3.set('type', 'expense')
      tx3.set('amount', invInstallmentValue)
      tx3.set('description', 'Parcela ' + invNextPaid + '/' + invInstallmentsTotal + ': ' + invName)
      tx3.set('transaction_date', todayStr)
      tx3.set('source', 'investment')
      tx3.set('investment_id', invId)
      tx3.set('status', 'pending')
      tx3.set('is_shared', false)
      tx3.set('is_fixed', true)

      try {
        $app.save(tx3)
        investmentCreatedCount++

        inv.set('installments_paid', invNextPaid)
        if (invInstallmentsTotal > 0 && invNextPaid >= invInstallmentsTotal) {
          inv.set('is_active', false)
        }
        $app.save(inv)

        $app
          .logger()
          .info(
            'INVESTMENT: criada parcela ' +
              invNextPaid +
              '/' +
              invInstallmentsTotal +
              ' para ' +
              invName,
          )
      } catch (saveErr3) {
        $app
          .logger()
          .error('INVESTMENT: erro ao criar parcela para ' + invName, 'error', String(saveErr3))
      }
    }

    $app
      .logger()
      .info('RECURRING: recorrentes processadas', 'created', String(recurringCreatedCount))
    $app
      .logger()
      .info(
        'RECURRING: processo concluído',
        'debts_created',
        String(createdCount),
        'recurring_created',
        String(recurringCreatedCount),
        'investment_created',
        String(investmentCreatedCount),
      )
  } catch (err) {
    $app.logger().error('RECURRING: erro geral', 'error', String(err))
  }
})
