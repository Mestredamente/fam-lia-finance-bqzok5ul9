onRecordDeleteRequest(
  (e) => {
    if (e.hasSuperuserAuth()) {
      return e.next()
    }

    var auth = e.requestInfo().auth
    var authId = auth ? auth.id : ''
    if (!authId) return e.forbiddenError('Autenticacao necessaria')

    var record = e.record
    var collectionName = record.collection().name

    // Guardian: allow everything
    // Co-admin: needs perm_delete_transactions (transactions) / perm_delete_invoices (invoices) / perm_manage_debts (debts)
    // Member: only own records
    // Guest: denied
    var member = null
    try {
      member = $app.findFirstRecordByFilter('members', 'user_id = {:uid}', { uid: authId })
    } catch (_) {}

    var accessLevel = member ? member.getString('access_level') : ''

    var action = 'delete'
    $app
      .logger()
      .info(
        'AUTH: user=' +
          authId +
          ' level=' +
          accessLevel +
          ' action=' +
          action +
          ' collection=' +
          collectionName,
      )

    if (accessLevel === 'guardian') return e.next()

    if (accessLevel === 'guest' || !accessLevel) {
      return e.forbiddenError('Sem permissao para excluir este registro')
    }

    // Family creator (guardian-equivalent for legacy families)
    try {
      var familyId = record.getString('family_id')
      var family = $app.findRecordById('families', familyId)
      if (family.getString('created_by') === authId) return e.next()
    } catch (_) {}

    // Co-admin with the relevant delete perm
    if (accessLevel === 'co_admin') {
      if (collectionName === 'transactions' && member.getBool('perm_delete_transactions'))
        return e.next()
      if (collectionName === 'invoices' && member.getBool('perm_delete_invoices')) return e.next()
      if (collectionName === 'debts' && member.getBool('perm_manage_debts')) return e.next()
    }

    // Owner of the record
    try {
      var ownerId = record.getString('owner_id')
      if (ownerId) {
        var ownerMember = $app.findRecordById('members', ownerId)
        if (ownerMember.getString('user_id') === authId) return e.next()
      }
    } catch (_) {}

    return e.forbiddenError('Sem permissao para excluir este registro')
  },
  'transactions',
  'invoices',
  'debts',
)
