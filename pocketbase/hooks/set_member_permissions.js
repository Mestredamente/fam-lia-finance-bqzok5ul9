onRecordAfterCreateSuccess((e) => {
  var member = e.record
  var userId = member.getString('user_id')
  var familyId = member.getString('family_id')

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

  if (!userId || !familyId) {
    try {
      var record = $app.findRecordById('members', member.id)
      if (!record.getString('access_level')) {
        record.set('access_level', 'member')
        $app.save(record)
      }
    } catch (_) {}
    return e.next()
  }

  try {
    var family = $app.findRecordById('families', familyId)
    var createdBy = family.getString('created_by')
    var record = $app.findRecordById('members', member.id)

    if (createdBy === userId) {
      record.set('access_level', 'guardian')
      for (var i = 0; i < permFields.length; i++) {
        record.set(permFields[i], true)
      }
    } else if (!record.getString('access_level')) {
      record.set('access_level', 'member')
    }

    $app.save(record)
  } catch (err) {
    $app.logger().error('SET_MEMBER_PERMS: ' + String(err))
  }

  return e.next()
}, 'members')
