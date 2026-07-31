routerAdd(
  'DELETE',
  '/backend/v1/members/{id}/cascade',
  (e) => {
    var memberId = e.request.pathValue('id')
    if (!memberId) return e.badRequestError('Member ID is required')

    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Authentication required')

    var member = null
    try {
      member = $app.findRecordById('members', memberId)
    } catch (_) {
      return e.notFoundError('Member not found')
    }

    var familyId = member.getString('family_id')
    var family = null
    try {
      family = $app.findRecordById('families', familyId)
    } catch (_) {
      return e.notFoundError('Family not found')
    }

    var familyCreator = family.getString('created_by')
    var memberUserId = member.getString('user_id')

    if (authId !== familyCreator && authId !== memberUserId) {
      return e.forbiddenError('You are not authorized to delete this member')
    }

    var deletedCount = 0

    // 1. Delete invoice_items belonging to invoices owned by this member
    try {
      var invoices = $app.findRecordsByFilter(
        'invoices',
        "owner_id = '" + memberId + "'",
        '',
        500,
        0,
      )
      for (var i = 0; i < invoices.length; i++) {
        var invId = invoices[i].getId()
        try {
          var items = $app.findRecordsByFilter(
            'invoice_items',
            "invoice_id = '" + invId + "'",
            '',
            500,
            0,
          )
          for (var j = 0; j < items.length; j++) {
            $app.delete(items[j])
            deletedCount++
          }
        } catch (_) {}
        $app.delete(invoices[i])
        deletedCount++
      }
    } catch (_) {}

    // 2. Delete from owner_id collections: transactions, investments, debts, credit_cards
    var ownerCols = ['transactions', 'investments', 'debts', 'credit_cards']
    for (var c = 0; c < ownerCols.length; c++) {
      try {
        var recs = $app.findRecordsByFilter(
          ownerCols[c],
          "owner_id = '" + memberId + "'",
          '',
          500,
          0,
        )
        for (var r = 0; r < recs.length; r++) {
          $app.delete(recs[r])
          deletedCount++
        }
      } catch (_) {}
    }

    // 3. Delete from user_id collections: emotional_journal, challenges, ai_conversations
    var userCols = ['emotional_journal', 'challenges', 'ai_conversations']
    for (var u = 0; u < userCols.length; u++) {
      try {
        var urecs = $app.findRecordsByFilter(
          userCols[u],
          "user_id = '" + memberId + "'",
          '',
          500,
          0,
        )
        for (var ur = 0; ur < urecs.length; ur++) {
          $app.delete(urecs[ur])
          deletedCount++
        }
      } catch (_) {}
    }

    // 4. Delete household_tasks where assigned_to or created_by is the member
    try {
      var tasks = $app.findRecordsByFilter(
        'household_tasks',
        "assigned_to = '" + memberId + "'",
        '',
        500,
        0,
      )
      for (var t = 0; t < tasks.length; t++) {
        $app.delete(tasks[t])
        deletedCount++
      }
    } catch (_) {}
    try {
      var tasks2 = $app.findRecordsByFilter(
        'household_tasks',
        "created_by = '" + memberId + "'",
        '',
        500,
        0,
      )
      for (var t2 = 0; t2 < tasks2.length; t2++) {
        $app.delete(tasks2[t2])
        deletedCount++
      }
    } catch (_) {}

    // 5. Finally delete the member
    $app.delete(member)
    deletedCount++

    // 6. If self-deletion, also delete the auth user record
    if (authId === memberUserId) {
      try {
        var authUser = $app.findRecordById('users', authId)
        $app.delete(authUser)
        deletedCount++
      } catch (_) {}
    }

    return e.json(200, { success: true, deletedRecords: deletedCount })
  },
  $apis.requireAuth(),
)
