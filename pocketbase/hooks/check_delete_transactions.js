onRecordDeleteRequest((e) => {
  var authId = e.requestInfo().auth ? e.requestInfo().auth.id : ''
  if (!authId) return e.forbiddenError('Autenticacao necessaria')

  var record = e.record
  var familyId = record.getString('family_id')

  try {
    var family = $app.findRecordById('families', familyId)
    if (family.getString('created_by') === authId) return e.next()
  } catch (_) {}

  try {
    var ownerId = record.getString('owner_id')
    if (ownerId) {
      var ownerMember = $app.findRecordById('members', ownerId)
      if (ownerMember.getString('user_id') === authId) return e.next()
    }
  } catch (_) {}

  try {
    var member = $app.findFirstRecordByFilter('members', 'user_id = "' + authId + '"')
    var accessLevel = member.getString('access_level')
    if (accessLevel === 'guardian') return e.next()
    if (accessLevel === 'co_admin' && member.get('perm_delete_transactions')) return e.next()
  } catch (_) {}

  return e.forbiddenError('Sem permissao para excluir esta transacao')
}, 'transactions')
