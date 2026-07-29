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

    if (!inviteCode || !userId || !role || !displayName || !email) {
      return e.json(200, { success: false, error: 'Dados incompletos.' })
    }

    var validRoles = ['husband', 'wife', 'partner', 'child']
    if (validRoles.indexOf(role) === -1) {
      return e.json(200, { success: false, error: 'Papel inválido.' })
    }

    try {
      var invite = $app.findFirstRecordByData('family_invites', 'invite_code', inviteCode)

      var usedBy = invite.getString('used_by')
      if (usedBy) {
        return e.json(200, { success: false, error: 'Código já utilizado.' })
      }

      var expiresAt = invite.getString('expires_at')
      if (expiresAt) {
        var expiry = new Date(expiresAt)
        if (expiry.getTime() < Date.now()) {
          return e.json(200, { success: false, error: 'Código expirado.' })
        }
      }

      var familyId = invite.getString('family_id')

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

      invite.set('used_by', userId)
      invite.set('used_at', new Date().toISOString())
      $app.save(invite)

      var familyName = ''
      try {
        var family = $app.findRecordById('families', familyId)
        familyName = family.getString('name')
      } catch (_) {}

      return e.json(200, { success: true, family_name: familyName })
    } catch (err) {
      return e.json(200, { success: false, error: 'Erro ao entrar na família. Tente novamente.' })
    }
  },
  $apis.requireAuth(),
)
