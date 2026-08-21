// Cascade delete for parcelada (installment) transactions.
//
// When a transaction that is a "mãe" (mother) is deleted — i.e. other
// transactions reference it via parent_transaction_id — all of its "filhas"
// (daughters/installments) are deleted automatically and silently.
//
// - Deleting a mother  → mother + all filhas removed.
// - Deleting a filha   → only that filha removed (mother untouched).
// - Deleting a normal   → removed normally.
//
// Uses onRecordAfterDeleteSuccess (post-commit). Internal $app.delete() calls
// on the filhas re-trigger this hook, but a filha never has children of its
// own (parent_transaction_id points only to the mother), so the cascade
// terminates — no infinite recursion.
onRecordAfterDeleteSuccess((e) => {
  var deletedId = e.record
    ? e.record.id || (typeof e.record.getId === 'function' ? e.record.getId() : '')
    : ''
  if (!deletedId) return

  var children = []
  try {
    children = $app.findRecordsByFilter(
      'transactions',
      'parent_transaction_id = {:pid}',
      '-transaction_date',
      500,
      0,
      { pid: deletedId },
    )
  } catch (_) {
    return
  }

  for (var i = 0; i < children.length; i++) {
    try {
      $app.delete(children[i])
    } catch (_) {}
  }
}, 'transactions')
