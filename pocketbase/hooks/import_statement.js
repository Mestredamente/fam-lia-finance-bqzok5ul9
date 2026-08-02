routerAdd(
  'POST',
  '/backend/v1/import-statement',
  (e) => {
    var body = e.requestInfo().body || {}
    var content = body.content || ''
    var filename = body.filename || ''
    var familyId = body.family_id || ''

    if (!content || !filename || !familyId) {
      return e.badRequestError('content, filename e family_id são obrigatórios')
    }

    var isOFX = filename.toLowerCase().endsWith('.ofx')
    var parsedRows = []

    if (isOFX) {
      var regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
      var match
      while ((match = regex.exec(content)) !== null) {
        var block = match[1]
        var getTag = function (tag) {
          var m = block.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i'))
          return m ? m[1].trim() : ''
        }
        var trnAmt = getTag('TRNAMT')
        var dtPosted = getTag('DTPOSTED')
        var name = getTag('NAME')
        var memo = getTag('MEMO')
        var dateStr = ''
        if (dtPosted.length >= 8) {
          dateStr =
            dtPosted.substring(0, 4) +
            '-' +
            dtPosted.substring(4, 6) +
            '-' +
            dtPosted.substring(6, 8)
        }
        parsedRows.push({
          description: [name, memo].filter(Boolean).join(' - ') || 'Sem descrição',
          amount: Math.abs(parseFloat(trnAmt) || 0),
          date: dateStr,
          type: parseFloat(trnAmt) < 0 ? 'expense' : 'income',
        })
      }
    } else {
      var text = content
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
      var lines = text.split(/\r?\n/).filter(function (l) {
        return l.trim()
      })
      if (lines.length < 2) {
        return e.json(200, { transactions: [], categories: [] })
      }
      var firstLine = lines[0]
      var delim = firstLine.indexOf(';') !== -1 ? ';' : firstLine.indexOf('\t') !== -1 ? '\t' : ','

      var parseLine = function (line) {
        var result = []
        var current = ''
        var inQuotes = false
        for (var i = 0; i < line.length; i++) {
          var ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (ch === delim && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        result.push(current.trim())
        return result
      }

      var columns = parseLine(firstLine)
      for (var i = 1; i < lines.length; i++) {
        var values = parseLine(lines[i])
        var row = {}
        for (var j = 0; j < columns.length; j++) row[columns[j]] = values[j] || ''

        var dateStr = ''
        var desc = ''
        var amount = 0
        var type = 'expense'

        for (var k = 0; k < columns.length; k++) {
          var col = columns[k]
          var lower = col.toLowerCase()
          var val = row[col]
          if (lower.indexOf('data') !== -1 || lower.indexOf('date') !== -1) {
            if (val) {
              if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
                dateStr = val.substring(0, 10)
              } else {
                var parts = val.split(/[/.-]/)
                if (parts.length === 3) {
                  if (parts[0].length === 4)
                    dateStr =
                      parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0')
                  else
                    dateStr =
                      parts[2].padStart(4, '20') +
                      '-' +
                      parts[1].padStart(2, '0') +
                      '-' +
                      parts[0].padStart(2, '0')
                }
              }
            }
          } else if (
            lower.indexOf('desc') !== -1 ||
            lower.indexOf('hist') !== -1 ||
            lower.indexOf('name') !== -1
          ) {
            desc = val
          } else if (lower.indexOf('valor') !== -1 || lower.indexOf('amount') !== -1) {
            var cleaned = val
              .replace(/[^\d,.-]/g, '')
              .replace(/\.(?=\d{3}(\D|$))/g, '')
              .replace(',', '.')
            amount = Math.abs(parseFloat(cleaned) || 0)
            type = parseFloat(cleaned) < 0 ? 'expense' : 'income'
          }
        }
        if (desc || amount > 0) {
          parsedRows.push({
            description: desc || 'Sem descrição',
            amount: amount,
            date: dateStr,
            type: type,
          })
        }
      }
    }

    var filteredRows = []
    for (var fri = 0; fri < parsedRows.length; fri++) {
      var frow = parsedRows[fri]
      if (frow.amount <= 0) continue
      var fLowerDesc = (frow.description || '').toLowerCase()
      if (
        fLowerDesc.indexOf('pagamento') !== -1 ||
        fLowerDesc.indexOf('crédito') !== -1 ||
        fLowerDesc.indexOf('credito') !== -1 ||
        fLowerDesc.indexOf('estorno') !== -1
      )
        continue
      filteredRows.push(frow)
    }
    parsedRows = filteredRows

    var rules = []
    var categories = []
    try {
      rules = $app.findRecordsByFilter(
        'categorization_rules',
        'family_id = "' + familyId + '"',
        'created',
        100,
        0,
      )
    } catch (_) {}
    try {
      categories = $app.findRecordsByFilter(
        'categories',
        'family_id = "' + familyId + '"',
        'created',
        100,
        0,
      )
    } catch (_) {}

    var catMap = {}
    for (var c = 0; c < categories.length; c++) {
      catMap[categories[c].id] = {
        id: categories[c].id,
        name: categories[c].getString('name'),
        type: categories[c].getString('type'),
      }
    }
    var transactions = parsedRows.map(function (row) {
      var suggestedCategoryId = null
      var suggestedCategoryName = null
      var lowerDesc = (row.description || '').toLowerCase()

      for (var r = 0; r < rules.length; r++) {
        var keyword = rules[r].getString('keyword').toLowerCase()
        var matchType = rules[r].getString('match_type')
        var catId = rules[r].getString('category_id')

        if (matchType === 'contains' && lowerDesc.indexOf(keyword) !== -1) {
          suggestedCategoryId = catId
          break
        }
        if (matchType === 'starts_with' && lowerDesc.startsWith(keyword)) {
          suggestedCategoryId = catId
          break
        }
      }

      if (suggestedCategoryId && catMap[suggestedCategoryId]) {
        suggestedCategoryName = catMap[suggestedCategoryId].name
      }

      return {
        description: row.description,
        amount: row.amount,
        transaction_date: row.date || new Date().toISOString().split('T')[0],
        type: row.type,
        suggested_category_id: suggestedCategoryId,
        suggested_category_name: suggestedCategoryName,
      }
    })

    return e.json(200, {
      transactions: transactions,
      categories: Object.keys(catMap).map(function (key) {
        return catMap[key]
      }),
    })
  },
  $apis.requireAuth(),
)
