routerAdd('GET', '/backend/v1/health', (e) => {
  var dbOk = false
  try {
    $app.findCollectionByNameOrId('users')
    dbOk = true
  } catch (_) {}

  return e.json(200, {
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk,
    timestamp: new Date().toISOString(),
  })
})
