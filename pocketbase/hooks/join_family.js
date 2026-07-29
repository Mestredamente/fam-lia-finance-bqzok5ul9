routerAdd(
  'POST',
  '/backend/v1/join-family',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Headers', 'authorization,content-type')

    var body = e.requestInfo().body || {}
    var inviteCode = (body.invite_code || '').trim().toUpperCase()
    var userId = body.user_id || ''
    var role = body.role || ''
    var displayName = body.display_name || ''
    var email = body.email || ''

    console.log(
      '[join-family] received invite_code:',
      inviteCode,
      'user_id:',
      userId,
      'role:',
      role,
    )

    if (!inviteCode || !userId || !role || !displayName || !email) {
      console.log('[join-family] missing required fields')
      return e.json(200, { valid: false, error: 'Dados incompletos.' })
    }

    var validRoles = ['husband', 'wife', 'partner', 'child']
    if (validRoles.indexOf(role) === -1) {
      console.log('[join-family] invalid role:', role)
      return e.json(200, { valid: false, error: 'Papel inválido.' })
    }

    var invite = null
    try {
      invite = $app.findFirstRecordByData('family_invites', 'invite_code', inviteCode)
      console.log('[join-family] found in family_invites, id:', invite.getId())
    } catch (_) {
      console.log('[join-family] not found in family_invites, falling back to families')
    }

    if (!invite) {
      var familyRecord = null
      try {
        familyRecord = $app.findFirstRecordByData('families', 'invite_code', inviteCode)
        console.log('[join-family] found in families, id:', familyRecord.getId())
      } catch (_) {
        console.log('[join-family] not found in families either')
      }

      if (familyRecord) {
        var famId = familyRecord.getId()
        var famCreatedBy = familyRecord.getString('created_by')

        var expiresAtDate = new Date()
        expiresAtDate.setDate(expiresAtDate.getDate() + 30)

        var invitesCol = $app.findCollectionByNameOrId('family_invites')
        invite = new Record(invitesCol)
        invite.set('family_id', famId)
        invite.set('invite_code', inviteCode)
        invite.set('created_by', famCreatedBy)
        invite.set('expires_at', expiresAtDate.toISOString())
        $app.save(invite)

        console.log('[join-family] created missing family_invites record for family:', famId)
      }
    }

    if (!invite) {
      console.log('[join-family] invite not found in either table')
      return e.json(200, { valid: false, error: 'Código inválido ou expirado.' })
    }

    var usedBy = invite.getString('used_by')
    if (usedBy) {
      console.log('[join-family] invite already used by:', usedBy)
      return e.json(200, { valid: false, error: 'Este convite já foi utilizado.' })
    }

    var expiresAt = invite.getString('expires_at')
    if (expiresAt) {
      var expiry = new Date(expiresAt)
      if (expiry.getTime() < Date.now()) {
        console.log('[join-family] invite expired:', expiresAt)
        return e.json(200, { valid: false, error: 'Este convite expirou.' })
      }
    }

    var familyId = invite.getString('family_id')
    console.log('[join-family] family_id:', familyId)

    var duplicateFilter = "family_id = '" + familyId + "' && user_id = '" + userId + "'"
    try {
      $app.findFirstRecordByFilter('members', duplicateFilter)
      console.log('[join-family] user already a member of this family')
      return e.json(200, { valid: false, error: 'Você já faz parte desta família.' })
    } catch (_) {}

    var membersCol = $app.findCollectionByNameOrId('members')
    var member = new Record(membersCol)
    member.set('family_id', familyId)
    member.set('user_id', userId)
    member.set('role', role)
    member.set('display_name', displayName)
    member.set('email', email)
    if (body.monthly_income !== undefined) {
      member.set('monthly_income', body.monthly_income)
    }
    if (body.payday !== undefined) {
      member.set('payday', body.payday)
    }
    if (body.notify_bills !== undefined) {
      member.set('notify_bills', body.notify_bills)
    }
    if (body.notify_ai_tips !== undefined) {
      member.set('notify_ai_tips', body.notify_ai_tips)
    }
    if (body.share_data !== undefined) {
      member.set('share_data', body.share_data)
    }
    $app.save(member)
    console.log('[join-family] created member record, id:', member.getId())

    invite.set('used_by', userId)
    invite.set('used_at', new Date().toISOString())
    $app.save(invite)
    console.log('[join-family] marked invite as used by:', userId)

    var familyName = ''
    try {
      var family = $app.findRecordById('families', familyId)
      familyName = family.getString('name')
    } catch (_) {}

    console.log('[join-family] success, family_name:', familyName)
    return e.json(200, { valid: true, family_name: familyName })
  },
  $apis.requireAuth(),
)
