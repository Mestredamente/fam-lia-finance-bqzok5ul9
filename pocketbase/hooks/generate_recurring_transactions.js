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

    $app.logger().info('RECURRING: processo concluído', 'created', String(createdCount))
  } catch (err) {
    $app.logger().error('RECURRING: erro geral', 'error', String(err))
  }
})
