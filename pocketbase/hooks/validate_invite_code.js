routerAdd(
  'GET',
  '/backend/v1/validate-invite-code',
  (e) => {
    e.response.header().set('Access-Control-Allow-Origin', '*')
    e.response.header().set('Access-Control-Allow-Headers', 'authorization,content-type')

    const inviteCode = (e.requestInfo().query['invite_code'] || '').trim().toUpperCase()

    if (!inviteCode) {
      return e.json(200, { valid: false, error: 'Código inválido ou expirado.' })
    }

    try {
      const invite = $app.findFirstRecordByData('family_invites', 'invite_code', inviteCode)

      var usedBy = invite.getString('used_by')
      if (usedBy) {
        return e.json(200, { valid: false, error: 'Código já utilizado.' })
      }

      var expiresAt = invite.getString('expires_at')
      if (expiresAt) {
        var expiry = new Date(expiresAt)
        if (expiry.getTime() < Date.now()) {
          return e.json(200, { valid: false, error: 'Código expirado.' })
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

      return e.json(200, { valid: true, family_name: familyName, creator_name: creatorName })
    } catch (err) {
      return e.json(200, { valid: false, error: 'Código inválido ou expirado.' })
    }
  },
  $apis.requireAuth(),
)
