migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('members')

    if (!col.fields.getByName('access_level')) {
      col.fields.add(
        new SelectField({
          name: 'access_level',
          values: ['guardian', 'co_admin', 'member', 'guest'],
          maxSelect: 1,
        }),
      )
    }

    var permFields = [
      'perm_view_others',
      'perm_edit_others',
      'perm_view_patrimony',
      'perm_view_budgets',
      'perm_import_invoices',
      'perm_delete_transactions',
      'perm_delete_invoices',
      'perm_manage_debts',
      'perm_manage_members',
    ]

    for (var i = 0; i < permFields.length; i++) {
      if (!col.fields.getByName(permFields[i])) {
        col.fields.add(new BoolField({ name: permFields[i] }))
      }
    }

    app.save(col)

    var families = app.findRecordsByFilter('families', 'id != ""', 'created', 500, 0)
    for (var f = 0; f < families.length; f++) {
      var family = families[f]
      var createdBy = family.getString('created_by')

      try {
        var creatorMember = app.findFirstRecordByFilter('members', 'user_id = "' + createdBy + '"')
        creatorMember.set('access_level', 'guardian')
        for (var p = 0; p < permFields.length; p++) creatorMember.set(permFields[p], true)
        app.save(creatorMember)
      } catch (_) {}

      var otherMembers = app.findRecordsByFilter(
        'members',
        'family_id = "' + family.id + '" && user_id != "' + createdBy + '"',
        'created',
        500,
        0,
      )
      for (var m = 0; m < otherMembers.length; m++) {
        if (!otherMembers[m].getString('access_level')) {
          otherMembers[m].set('access_level', 'member')
        }
        for (var p2 = 0; p2 < permFields.length; p2++) {
          otherMembers[m].set(permFields[p2], false)
        }
        app.save(otherMembers[m])
      }
    }

    var allMembers = app.findRecordsByFilter('members', 'id != ""', 'created', 500, 0)
    for (var am = 0; am < allMembers.length; am++) {
      if (!allMembers[am].getString('access_level')) {
        allMembers[am].set('access_level', 'member')
        app.save(allMembers[am])
      }
    }

    var transactions = app.findCollectionByNameOrId('transactions')
    transactions.deleteRule = "@request.auth.id != ''"
    app.save(transactions)

    var invoices = app.findCollectionByNameOrId('invoices')
    invoices.deleteRule = "@request.auth.id != ''"
    app.save(invoices)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('members')
    var fieldsToRemove = [
      'access_level',
      'perm_view_others',
      'perm_edit_others',
      'perm_view_patrimony',
      'perm_view_budgets',
      'perm_import_invoices',
      'perm_delete_transactions',
      'perm_delete_invoices',
      'perm_manage_debts',
      'perm_manage_members',
    ]
    for (var i = 0; i < fieldsToRemove.length; i++) {
      var f = col.fields.getByName(fieldsToRemove[i])
      if (f) col.fields.removeById(f.id)
    }
    app.save(col)

    var transactions = app.findCollectionByNameOrId('transactions')
    transactions.deleteRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    app.save(transactions)

    var invoices = app.findCollectionByNameOrId('invoices')
    invoices.deleteRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    app.save(invoices)
  },
)
