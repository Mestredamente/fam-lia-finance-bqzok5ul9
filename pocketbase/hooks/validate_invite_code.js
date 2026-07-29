routerAdd(
  'GET',
  '/backend/v1/validate-invite-code',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Headers', 'authorization,content-type')

    var inviteCode = (e.requestInfo().query['invite_code'] || '').trim().toUpperCase()

    console.log('[validate-invite-code] received code:', inviteCode)

    if (!inviteCode) {
      console.log('[validate-invite-code] empty code, returning invalid')
      return e.json(200, { valid: false, error: 'Código inválido ou expirado.' })
    }

    var invite = null
    try {
      invite = $app.findFirstRecordByData('family_invites', 'invite_code', inviteCode)
      console.log('[validate-invite-code] found in family_invites, id:', invite.getId())
    } catch (_) {
      console.log('[validate-invite-code] not found in family_invites, falling back to families')
    }

    if (invite) {
      var usedBy = invite.getString('used_by')
      if (usedBy) {
        console.log('[validate-invite-code] invite already used by:', usedBy)
        return e.json(200, { valid: false, error: 'Este convite já foi utilizado.' })
      }

      var expiresAt = invite.getString('expires_at')
      if (expiresAt) {
        var expiry = new Date(expiresAt)
        if (expiry.getTime() < Date.now()) {
          console.log('[validate-invite-code] invite expired:', expiresAt)
          return e.json(200, { valid: false, error: 'Este convite expirou.' })
        }
      }

      var familyName = ''
      var familyId = invite.getString('family_id')
      try {
        var family = $app.findRecordById('families', familyId)
        familyName = family.getString('name')
      } catch (_) {}

      var creatorName = ''
      var creatorId = invite.getString('created_by')
      try {
        var creator = $app.findRecordById('users', creatorId)
        creatorName = creator.getString('name')
      } catch (_) {}

      console.log(
        '[validate-invite-code] valid invite, family_name:',
        familyName,
        'creator_name:',
        creatorName,
      )
      return e.json(200, { valid: true, family_name: familyName, creator_name: creatorName })
    }

    var familyRecord = null
    try {
      familyRecord = $app.findFirstRecordByData('families', 'invite_code', inviteCode)
      console.log('[validate-invite-code] found in families, id:', familyRecord.getId())
    } catch (_) {
      console.log('[validate-invite-code] not found in families either')
    }

    if (familyRecord) {
      var famId = familyRecord.getId()
      var famName = familyRecord.getString('name')
      var famCreatedBy = familyRecord.getString('created_by')

      var expiresAtDate = new Date()
      expiresAtDate.setDate(expiresAtDate.getDate() + 30)

      var invitesCol = $app.findCollectionByNameOrId('family_invites')
      var newInvite = new Record(invitesCol)
      newInvite.set('family_id', famId)
      newInvite.set('invite_code', inviteCode)
      newInvite.set('created_by', famCreatedBy)
      newInvite.set('expires_at', expiresAtDate.toISOString())
      $app.save(newInvite)

      console.log('[validate-invite-code] created missing family_invites record for family:', famId)

      var creatorNameFallback = ''
      try {
        var creatorUser = $app.findRecordById('users', famCreatedBy)
        creatorNameFallback = creatorUser.getString('name')
      } catch (_) {}

      console.log(
        '[validate-invite-code] valid (fallback), family_name:',
        famName,
        'creator_name:',
        creatorNameFallback,
      )
      return e.json(200, { valid: true, family_name: famName, creator_name: creatorNameFallback })
    }

    console.log('[validate-invite-code] not found in either table, returning invalid')
    return e.json(200, { valid: false, error: 'Código inválido ou expirado.' })
  },
  $apis.requireAuth(),
)
