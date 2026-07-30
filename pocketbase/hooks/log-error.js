routerAdd(
  'POST',
  '/backend/v1/log-error',
  (e) => {
    var body = e.requestInfo().body || {}
    var errorMessage = body.error_message || 'Unknown error'
    var stackTrace = body.stack_trace || ''
    var userId = 'anonymous'
    if (e.auth && e.auth.id) userId = e.auth.id

    $app
      .logger()
      .error(
        'Frontend error',
        'error_message',
        errorMessage,
        'stack_trace',
        stackTrace,
        'user_id',
        userId,
      )

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
