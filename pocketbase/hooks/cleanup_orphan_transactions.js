routerAdd(
  'POST',
  '/backend/v1/transactions/cleanup-orphans',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var familyIds = []
    try {
      var members = $app.findRecordsByFilter(
        'members',
        'user_id = "' + userId + '"',
        'created',
        100,
        0,
      )
      for (var i = 0; i < members.length; i++) {
        var fid = members[i].getString('family_id')
        if (fid && familyIds.indexOf(fid) === -1) familyIds.push(fid)
      }
    } catch (_) {}

    if (familyIds.length === 0) {
      return e.json(200, {
        deleted: 0,
        remaining_null_category: 0,
        before_null_category: 0,
        before_filled_category: 0,
      })
    }

    var beforeNullCategory = 0
    var beforeFilledCategory = 0
    var deletedCount = 0
    var remainingNullCategory = 0

    for (var fi = 0; fi < familyIds.length; fi++) {
      var familyId = familyIds[fi]

      var allTxs = []
      try {
        allTxs = $app.findRecordsByFilter(
          'transactions',
          'family_id = "' + familyId + '"',
          'created',
          500,
          0,
        )
      } catch (_) {
        continue
      }

      for (var ti = 0; ti < allTxs.length; ti++) {
        var tx = allTxs[ti]
        var catId = tx.getString('category_id')

        if (!catId || catId === '') {
          beforeNullCategory++

          var invoiceItemId = tx.getString('invoice_item_id')
          var isOrphan = false

          if (!invoiceItemId || invoiceItemId === '') {
            isOrphan = true
          } else {
            try {
              $app.findRecordById('invoice_items', invoiceItemId)
            } catch (_) {
              isOrphan = true
            }
          }

          if (isOrphan) {
            try {
              $app.delete(tx)
              deletedCount++
            } catch (_) {
              remainingNullCategory++
            }
          } else {
            remainingNullCategory++
          }
        } else {
          beforeFilledCategory++
        }
      }
    }

    return e.json(200, {
      deleted: deletedCount,
      remaining_null_category: remainingNullCategory,
      before_null_category: beforeNullCategory,
      before_filled_category: beforeFilledCategory,
    })
  },
  $apis.requireAuth(),
)
