// Guardian / partner notifications on transaction create + update.
//
// When a member of a family creates or edits a transaction, every OTHER active
// member of the same family receives a notification (type transaction_created or
// transaction_updated). On update, we only notify when a relevant field
// (amount, description or status) actually changed.
//
// IMPORTANT (per the Skip Cloud pb_hooks conventions): the JSVM executes each
// callback in a separate VM pool from the one that registers it, so top-level
// declarations are NOT visible inside the callbacks. All logic is therefore
// self-contained inside each onRecordAfter*Success callback.

onRecordAfterCreateSuccess((e) => {
  try {
    var tx = e.record
    var familyId = tx.getString('family_id')
    var ownerId = tx.getString('owner_id')
    if (!familyId || !ownerId) return e.next()

    var description = tx.getString('description') || ''
    var amount = tx.get('amount') || 0

    // Resolve the creator's display name: prefer the member nickname, fall
    // back to the linked user's name.
    var creatorName = 'Membro'
    var creatorUserId = null
    try {
      var ownerRec = $app.findRecordById('members', ownerId)
      creatorName = ownerRec.getString('display_name') || ''
      creatorUserId = ownerRec.getString('user_id') || null
      if (!creatorName) {
        try {
          var userRec = $app.findRecordById('users', creatorUserId)
          creatorName = userRec.getString('name') || 'Membro'
        } catch (_) {}
      }
    } catch (_) {}

    // Create notifications for every OTHER active member of the family.
    var members = []
    try {
      members = $app.findRecordsByFilter(
        'members',
        'family_id = "' + familyId + '" && is_active = true',
        'created',
        500,
        0,
      )
    } catch (_) {
      members = []
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var message = description + ' - R$ ' + amount.toFixed(2).replace('.', ',')
    var title = 'Nova transação de ' + creatorName

    for (var i = 0; i < members.length; i++) {
      var m = members[i]
      var memberUserId = m.getString('user_id')
      // Exclude the creator themselves.
      if (creatorUserId && memberUserId === creatorUserId) continue
      if (!memberUserId) continue

      try {
        var notif = new Record(notifCol)
        notif.set('family_id', familyId)
        notif.set('user_id', memberUserId)
        notif.set('type', 'transaction_created')
        notif.set('title', title)
        notif.set('message', message)
        notif.set('is_read', false)
        notif.set('metadata', {
          transaction_id: tx.id,
          owner_id: ownerId,
          amount: amount,
          description: description,
        })
        $app.save(notif)
        console.log(
          '[notify_partner_transaction] created transaction_created for user ' +
            memberUserId +
            ' (family ' +
            familyId +
            ')',
        )
      } catch (saveErr) {
        console.log(
          '[notify_partner_transaction] ERROR saving create notif for user ' +
            memberUserId +
            ': ' +
            String(saveErr),
        )
      }
    }
  } catch (err) {
    console.log('[notify_partner_transaction] (create) general error: ' + String(err))
  }

  return e.next()
}, 'transactions')

onRecordAfterUpdateSuccess((e) => {
  try {
    var tx = e.record
    var familyId = tx.getString('family_id')
    var ownerId = tx.getString('owner_id')
    if (!familyId || !ownerId) return e.next()

    // Only notify when a relevant field actually changed. PocketBase exposes
    // the pre-save state via record.original().
    var orig = tx.original()
    var oldAmount = orig ? orig.get('amount') : null
    var oldDescription = orig ? orig.getString('description') : null
    var oldStatus = orig ? orig.getString('status') : null
    var newAmount = tx.get('amount')
    var newDescription = tx.getString('description')
    var newStatus = tx.getString('status')

    var changed =
      oldAmount !== newAmount || oldDescription !== newDescription || oldStatus !== newStatus
    if (!changed) return e.next()

    var description = newDescription || ''
    var amount = newAmount || 0

    var creatorName = 'Membro'
    var creatorUserId = null
    try {
      var ownerRec = $app.findRecordById('members', ownerId)
      creatorName = ownerRec.getString('display_name') || ''
      creatorUserId = ownerRec.getString('user_id') || null
      if (!creatorName) {
        try {
          var userRec = $app.findRecordById('users', creatorUserId)
          creatorName = userRec.getString('name') || 'Membro'
        } catch (_) {}
      }
    } catch (_) {}

    var members = []
    try {
      members = $app.findRecordsByFilter(
        'members',
        'family_id = "' + familyId + '" && is_active = true',
        'created',
        500,
        0,
      )
    } catch (_) {
      members = []
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var message = description + ' - R$ ' + amount.toFixed(2).replace('.', ',')
    var title = 'Transação atualizada por ' + creatorName

    for (var i = 0; i < members.length; i++) {
      var m = members[i]
      var memberUserId = m.getString('user_id')
      if (creatorUserId && memberUserId === creatorUserId) continue
      if (!memberUserId) continue

      try {
        var notif = new Record(notifCol)
        notif.set('family_id', familyId)
        notif.set('user_id', memberUserId)
        notif.set('type', 'transaction_updated')
        notif.set('title', title)
        notif.set('message', message)
        notif.set('is_read', false)
        notif.set('metadata', {
          transaction_id: tx.id,
          owner_id: ownerId,
          amount: amount,
          description: description,
          changes: {
            amount: oldAmount !== newAmount,
            description: oldDescription !== newDescription,
            status: oldStatus !== newStatus,
          },
        })
        $app.save(notif)
        console.log(
          '[notify_partner_transaction] created transaction_updated for user ' +
            memberUserId +
            ' (family ' +
            familyId +
            ')',
        )
      } catch (saveErr) {
        console.log(
          '[notify_partner_transaction] ERROR saving update notif for user ' +
            memberUserId +
            ': ' +
            String(saveErr),
        )
      }
    }
  } catch (err) {
    console.log('[notify_partner_transaction] (update) general error: ' + String(err))
  }

  return e.next()
}, 'transactions')
