routerAdd(
  'GET',
  '/backend/v1/check-gemini-models',
  (e) => {
    var GEMINI_API_KEY = $secrets.get('GEMINI_API_KEY') || ''
    if (!GEMINI_API_KEY) {
      return e.json(500, { error: 'GEMINI_API_KEY not configured' })
    }

    function bodyToText(rawBody) {
      if (!rawBody) return ''
      if (typeof rawBody === 'string') return rawBody
      if (rawBody instanceof ArrayBuffer) {
        var bytes = new Uint8Array(rawBody)
        var chars = []
        for (var bi = 0; bi < bytes.length; bi++) {
          chars.push(String.fromCharCode(bytes[bi]))
        }
        return chars.join('')
      }
      if (rawBody && typeof rawBody.length === 'number' && typeof rawBody[0] === 'number') {
        var bChars = []
        for (var bj = 0; bj < rawBody.length; bj++) {
          bChars.push(String.fromCharCode(rawBody[bj]))
        }
        return bChars.join('')
      }
      try {
        return String(rawBody)
      } catch (_) {
        return ''
      }
    }

    var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

    var listUrl = GEMINI_BASE + '/models?key=' + GEMINI_API_KEY
    var listRes = $http.send({
      url: listUrl,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 30,
    })

    var listBody = bodyToText(listRes.body)
    var modelsList = null
    var listError = null

    if (listRes.statusCode === 200) {
      try {
        modelsList = JSON.parse(listBody)
      } catch (_) {
        listError = 'Failed to parse models list: ' + listBody.substring(0, 500)
      }
    } else {
      listError = listBody
    }

    var hasFlash = false
    if (modelsList && modelsList.models) {
      for (var i = 0; i < modelsList.models.length; i++) {
        if (modelsList.models[i].name === 'models/gemini-2.0-flash') {
          hasFlash = true
          break
        }
      }
    }

    var flashTestUrl =
      GEMINI_BASE + '/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY
    var flashTestReqBody = JSON.stringify({
      contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
    })
    var flashTestRes = $http.send({
      url: flashTestUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: flashTestReqBody,
      timeout: 30,
    })
    var flashTestResBody = bodyToText(flashTestRes.body)
    var flash404Body = null
    if (flashTestRes.statusCode === 404) {
      flash404Body = flashTestResBody
    }

    var alternatives = [
      'gemini-2.0-flash-001',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ]
    var testResults = []
    var workingModel = null

    if (!hasFlash || flashTestRes.statusCode === 404) {
      for (var a = 0; a < alternatives.length; a++) {
        var model = alternatives[a]
        var testUrl = GEMINI_BASE + '/models/' + model + ':generateContent?key=' + GEMINI_API_KEY
        var testReqBody = JSON.stringify({
          contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
        })

        var testRes = $http.send({
          url: testUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: testReqBody,
          timeout: 30,
        })

        var testResBody = bodyToText(testRes.body)

        if (testRes.statusCode === 200) {
          testResults.push({
            model: model,
            status: 200,
            success: true,
          })
          workingModel = model
          break
        } else {
          testResults.push({
            model: model,
            status: testRes.statusCode,
            success: false,
            response: testResBody,
          })
        }
      }
    }

    var finalModel =
      workingModel || (hasFlash && flashTestRes.statusCode === 200 ? 'gemini-2.0-flash' : null)

    return e.json(200, {
      report: {
        models_list_response: modelsList,
        models_list_status: listRes.statusCode,
        models_list_error: listError,
        has_gemini_2_0_flash: hasFlash,
        gemini_2_0_flash_test_status: flashTestRes.statusCode,
        gemini_2_0_flash_404_body: flash404Body,
        alternative_model_tests: testResults,
        working_model: finalModel,
      },
    })
  },
  $apis.requireAuth(),
)
