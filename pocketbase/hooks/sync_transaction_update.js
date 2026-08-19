// Bidirectional sync when a transaction is UPDATED and its amount changed.
//
// Debts store `remaining_amount` which mirrors the sum of the still-to-pay
// transactions linked to them. When a debt_payment transaction's amount is
// edited, that mirror would drift. This hook reconciles it:
//
//   remaining_amount = remaining_amount - oldAmount + newAmount
//
// Only fires for transactions that have a debt_id, and only when the amount
// actually changed (comparing the new value against record.original()).
onRecordAfterUpdateSuccess((e) => {
  var tx = e.record
  if (!tx) return

  var debtId = ''
  try {
    debtId = tx.getString('debt_id') || ''
  } catch (_) {
    debtId = ''
  }
  if (!debtId) return

  var oldAmount = 0
  var newAmount = 0
  try {
    oldAmount = tx.original().getFloat('amount') || 0
  } catch (_) {
    oldAmount = 0
  }
  try {
    newAmount = tx.getFloat('amount') || 0
  } catch (_) {
    newAmount = 0
  }

  // No drift to fix if the amount didn't change.
  if (oldAmount === newAmount) return

  try {
    var debt = $app.findRecordById('debts', debtId)
    var remaining = debt.get('remaining_amount') || 0
    var newRemaining = Math.max(0, remaining - oldAmount + newAmount)
    debt.set('remaining_amount', newRemaining)

    // installments_remaining mirrors "parcels still to pay". When the amount
    // changes the number of parcels itself doesn't, but we re-derive it from
    // total - paid to keep it consistent with the rest of the system.
    var dTotal = debt.get('installments_total') || 0
    var dPaid = debt.get('installments_paid') || 0
    if (dTotal > 0) {
      debt.set('installments_remaining', Math.max(0, dTotal - dPaid))
    }

    $app.save(debt)
    $app
      .logger()
      .info(
        'SYNC_UPDATE: transacao ' +
          tx.getId() +
          ' -> divida ' +
          debtId +
          ' remaining=' +
          newRemaining +
          ' (delta=' +
          (newAmount - oldAmount) +
          ')',
      )
  } catch (err) {
    $app
      .logger()
      .error('SYNC_UPDATE: divida nao encontrada para tx ' + tx.getId(), 'error', String(err))
  }
}, 'transactions')
