cronAdd('expire_challenges', '59 23 * * *', () => {
  try {
    var families = []
    try {
      families = $app.findRecordsByFilter('families', '', 'created', 500, 0)
    } catch (err) {
      $app.logger().error('EXPIRE_CHALLENGES: erro ao buscar famílias', 'error', String(err))
      return
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var now = new Date()
    var y = now.getFullYear()
    var m = now.getMonth() + 1
    var d = now.getDate()
    var todayStr = y + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (d < 10 ? '0' + d : '' + d)

    for (var i = 0; i < families.length; i++) {
      var family = families[i]
      if (family.get('auto_challenge_expiry') === false) continue

      var familyId = family.id

      // 1. Buscar desafios com status='active' e end_date < today
      var expiredChallenges = []
      try {
        expiredChallenges = $app.findRecordsByFilter(
          'challenges',
          'family_id = "' + familyId + '" && status = "active" && end_date < "' + todayStr + '"',
          'created',
          100,
          0,
        )
      } catch (_) {
        expiredChallenges = []
      }

      for (var c = 0; c < expiredChallenges.length; c++) {
        var ch = expiredChallenges[c]
        var targetVal = ch.get('target_value') || 0
        var currentVal = ch.get('current_value') || 0
        var chTitle = ch.getString('title') || 'Desafio'
        var startDate = ch.getString('start_date')
        var endDate = ch.getString('end_date')

        var finalStatus = 'failed' // challenges schema: status select(active | completed | failed | abandoned)
        var notifType = 'challenge_expired'
        var notifTitle = ''
        var notifMessage = ''

        if (targetVal > 0) {
          // Se já tem current_value ou se puder recalcular com base no progresso
          // Se current_value >= targetVal
          var achieved = currentVal >= targetVal

          if (achieved) {
            finalStatus = 'completed'
            notifType = 'challenge_completed'
            notifTitle = 'Desafio concluído: ' + chTitle
            notifMessage =
              'Parabéns! Você atingiu a meta de R$ ' +
              targetVal.toFixed(2) +
              ' no desafio "' +
              chTitle +
              '".'
          } else {
            finalStatus = 'failed'
            notifType = 'challenge_expired'
            var diff = Math.max(0, targetVal - currentVal)
            notifTitle = 'Desafio não concluído: ' + chTitle
            notifMessage =
              'O desafio expirou. Faltaram R$ ' + diff.toFixed(2) + ' para atingir a meta.'
          }
        } else {
          finalStatus = 'failed'
          notifType = 'challenge_expired'
          notifTitle = 'Desafio expirado: ' + chTitle
          notifMessage = 'O prazo do desafio "' + chTitle + '" terminou.'
        }

        try {
          ch.set('status', finalStatus)
          $app.save(ch)

          var notif = new Record(notifCol)
          notif.set('family_id', familyId)
          notif.set('type', notifType)
          notif.set('title', notifTitle)
          notif.set('message', notifMessage)
          notif.set('is_read', false)
          notif.set('metadata', {
            challenge_id: ch.id,
            final_status: finalStatus,
            target_value: targetVal,
            current_value: currentVal,
          })
          $app.save(notif)
          $app
            .logger()
            .info('EXPIRE_CHALLENGES: Desafio processado', 'id', ch.id, 'status', finalStatus)
        } catch (saveErr) {
          $app
            .logger()
            .error(
              'EXPIRE_CHALLENGES: Erro ao salvar desafio/notificação',
              'id',
              ch.id,
              'error',
              String(saveErr),
            )
        }
      }
    }
  } catch (err) {
    $app.logger().error('EXPIRE_CHALLENGES: Erro geral no cron', 'error', String(err))
  }
})
