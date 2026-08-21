cronAdd('cleanup_old_notifications', '0 3 1 * *', () => {
  try {
    var families = []
    try {
      families = $app.findRecordsByFilter('families', '', 'created', 500, 0)
    } catch (err) {
      $app.logger().error('CLEANUP_NOTIFS: erro ao buscar famílias', 'error', String(err))
      return
    }

    var now = new Date()
    var d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    function fmtDate(d) {
      var y = d.getFullYear()
      var m = d.getMonth() + 1
      var day = d.getDate()
      return y + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (day < 10 ? '0' + day : '' + day)
    }

    var str60 = fmtDate(d60) + ' 00:00:00'

    for (var i = 0; i < families.length; i++) {
      var family = families[i]
      var familyId = family.id

      var oldNotifs = []
      try {
        oldNotifs = $app.findRecordsByFilter(
          'notifications',
          'family_id = "' + familyId + '" && is_read = true && created < "' + str60 + '"',
          'created',
          500,
          0,
        )
      } catch (_) {
        oldNotifs = []
      }

      var deletedCount = 0
      for (var j = 0; j < oldNotifs.length; j++) {
        try {
          $app.delete(oldNotifs[j])
          deletedCount++
        } catch (delErr) {
          $app
            .logger()
            .warn(
              'CLEANUP_NOTIFS: erro ao deletar notificação',
              'id',
              oldNotifs[j].id,
              'error',
              String(delErr),
            )
        }
      }

      if (deletedCount > 0) {
        $app
          .logger()
          .info('Limpeza: ' + deletedCount + ' notificações removidas para família ' + familyId)
      }
    }
  } catch (err) {
    $app.logger().error('CLEANUP_NOTIFS: Erro geral no cron', 'error', String(err))
  }
})
