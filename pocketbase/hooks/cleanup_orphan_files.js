routerAdd(
  'POST',
  '/backend/v1/cleanup-orphan-files',
  (e) => {
    var now = new Date()
    var sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000
    var sevenDaysAgo = new Date(sevenDaysAgoMs)

    function pad(n) {
      return n < 10 ? '0' + n : '' + n
    }

    var cutoffDate =
      sevenDaysAgo.getFullYear() +
      '-' +
      pad(sevenDaysAgo.getMonth() + 1) +
      '-' +
      pad(sevenDaysAgo.getDate()) +
      ' 00:00:00.000Z'

    var invoices = []
    try {
      invoices = $app.findRecordsByFilter(
        'invoices',
        'status = "pending" && parsed_data != ""',
        'created',
        500,
        0,
      )
    } catch (_) {}

    var cleaned = 0
    var skipped = 0

    var fsys = $app.newFilesystem()
    try {
      for (var i = 0; i < invoices.length; i++) {
        var inv = invoices[i]
        var createdAt = inv.getString('created')

        if (createdAt >= cutoffDate) {
          skipped++
          continue
        }

        var parsedData = inv.getString('parsed_data')
        if (!parsedData) {
          skipped++
          continue
        }

        var hasError = false
        try {
          var data = JSON.parse(parsedData)
          if (data && typeof data === 'object' && ('error' in data || 'erro' in data)) {
            hasError = true
          }
        } catch (_) {}

        if (!hasError) {
          skipped++
          continue
        }

        var fileName = inv.getString('raw_file_url')
        if (!fileName) {
          skipped++
          continue
        }

        var filePath = inv.baseFilesPath() + '/' + fileName
        try {
          if (fsys.exists(filePath)) {
            fsys.delete(filePath)
          }
        } catch (_) {}

        inv.set('raw_file_url', '')
        $app.save(inv)
        cleaned++
      }
    } finally {
      fsys.close()
    }

    return e.json(200, {
      success: true,
      cleaned: cleaned,
      skipped: skipped,
      total: invoices.length,
    })
  },
  $apis.requireAuth(),
)
