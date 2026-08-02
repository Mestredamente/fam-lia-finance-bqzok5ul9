onRecordAfterCreateSuccess((e) => {
  var itemId = e.record.id
  var familyId = e.record.getString('family_id')
  var description = e.record.getString('description')
  var existingSuggested = e.record.getString('suggested_category_id')

  if (existingSuggested) return e.next()
  if (!description || !familyId) return e.next()

  var rules = []
  try {
    rules = $app.findRecordsByFilter(
      'categorization_rules',
      'family_id = "' + familyId + '"',
      'created',
      500,
      0,
    )
  } catch (err) {
    return e.next()
  }

  if (rules.length === 0) return e.next()

  var bestMatch = null
  var bestKeywordLen = 0
  var lowerDesc = description.toLowerCase()

  for (var i = 0; i < rules.length; i++) {
    var keyword = rules[i].getString('keyword').toLowerCase()
    var matchType = rules[i].getString('match_type')
    var categoryId = rules[i].getString('category_id')

    var isMatch = false
    if (matchType === 'contains') {
      isMatch = lowerDesc.indexOf(keyword) !== -1
    } else if (matchType === 'starts_with') {
      isMatch = lowerDesc.indexOf(keyword) === 0
    }

    if (isMatch && keyword.length > bestKeywordLen) {
      bestMatch = categoryId
      bestKeywordLen = keyword.length
    }
  }

  if (bestMatch) {
    try {
      var record = $app.findRecordById('invoice_items', itemId)
      record.set('suggested_category_id', bestMatch)
      $app.save(record)
    } catch (err) {
      $app.logger().error('auto-categorize failed', 'itemId', itemId, 'error', String(err))
    }
  }

  return e.next()
}, 'invoice_items')
