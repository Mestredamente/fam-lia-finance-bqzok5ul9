// Bidirectional sync when a transaction is DELETED.
//
// Deleting a transaction may have to walk back side-effects that were applied
// to the parent records it touched (investment / debt installments, or simply
// leaving a recurring's generated transaction gone). This hook reconciles each
// of those after the delete commits:
//
//   a. investment_id != null
//      -> decrement installments_paid (never below 0)
//      -> if is_active=false and installments_paid < installments_total,
//         reativar: is_active=true
//
//   b. debt_id != null
//      -> decrement installments_paid (never below 0)
//      -> recalcular remaining_amount = remaining_amount + transaction.amount
//      -> if is_active=false and remaining_amount > 0, reativar: is_active=true
//
//   c. recurring_id != null E source='recurring'
//      -> NAO pausar a recorrente. A transacao foi excluida manualmente mas a
//         recorrencia continua ativa (o proximo ciclo volta a gerar).
//
// Fires onRecordAfterDeleteSuccess (post-commit) so the transaction is really
// gone before we touch the related investment/debt records.
onRecordAfterDeleteSuccess((e) => {
  var tx = e.record
  if (!tx) return

  var txId = tx.id || (typeof tx.getId === 'function' ? tx.getId() : '')

  // ── (a) Investment sync ───────────────────────────────────────────────
  var invId = ''
  try {
    invId = tx.getString('investment_id') || ''
  } catch (_) {
    invId = ''
  }
  if (invId) {
    try {
      var inv = $app.findRecordById('investments', invId)
      var invPaid = inv.get('installments_paid') || 0
      var newInvPaid = Math.max(0, invPaid - 1)
      inv.set('installments_paid', newInvPaid)

      var invTotal = inv.get('installments_total') || 0
      var invActive = inv.getBool('is_active')
      if (!invActive && invTotal > 0 && newInvPaid < invTotal) {
        inv.set('is_active', true)
      }
      $app.save(inv)
      $app
        .logger()
        .info(
          'SYNC_DELETE: transacao ' + txId + ' -> investimento ' + invId + ' paid=' + newInvPaid,
        )
    } catch (err) {
      $app
        .logger()
        .error('SYNC_DELETE: investimento nao encontrado para tx ' + txId, 'error', String(err))
    }
  }

  // ── (b) Debt sync ─────────────────────────────────────────────────────
  var debtId = ''
  try {
    debtId = tx.getString('debt_id') || ''
  } catch (_) {
    debtId = ''
  }
  if (debtId) {
    try {
      var debt = $app.findRecordById('debts', debtId)
      var dPaid = debt.get('installments_paid') || 0
      var newDPaid = Math.max(0, dPaid - 1)
      var txAmount = tx.get('amount') || 0
      var remaining = debt.get('remaining_amount') || 0
      var newRemaining = remaining + txAmount

      debt.set('installments_paid', newDPaid)
      debt.set('remaining_amount', newRemaining)

      // installments_remaining = total - paid (floor 0)
      var dTotal = debt.get('installments_total') || 0
      if (dTotal > 0) {
        debt.set('installments_remaining', Math.max(0, dTotal - newDPaid))
      }

      var dActive = debt.getBool('is_active')
      if (!dActive && newRemaining > 0) {
        debt.set('is_active', true)
        debt.set('status', 'active')
      }
      $app.save(debt)
      $app
        .logger()
        .info(
          'SYNC_DELETE: transacao ' +
            txId +
            ' -> divida ' +
            debtId +
            ' paid=' +
            newDPaid +
            ' remaining=' +
            newRemaining,
        )
    } catch (err2) {
      $app
        .logger()
        .error('SYNC_DELETE: divida nao encontrada para tx ' + txId, 'error', String(err2))
    }
  }

  // ── (c) Recurring ─────────────────────────────────────────────────────
  // Intentionally NO-OP on the recurring record. The frontend surfaces a
  // toast ("A recorrente continua ativa") with a "Pausar recorrente" action
  // when source='recurring' — but the server never auto-pauses.
  var recId = ''
  var src = ''
  try {
    recId = tx.getString('recurring_id') || ''
    src = tx.getString('source') || ''
  } catch (_) {}
  if (recId && src === 'recurring') {
    $app
      .logger()
      .info(
        'SYNC_DELETE: transacao ' +
          txId +
          ' de recorrente ' +
          recId +
          ' excluida. Recorrente permanece ativa.',
      )
  }
}, 'transactions')
