migrate(
  (app) => {
    var families = []
    try {
      families = app.findRecordsByFilter('families', 'id != ""', 'created', 500, 0)
    } catch (e) {
      console.log('No families found for dedup:', e.message)
      return
    }

    var totalRemoved = 0
    var rulesCol = app.findCollectionByNameOrId('categorization_rules')

    for (var fi = 0; fi < families.length; fi++) {
      var familyId = families[fi].get('id')

      var rules = []
      try {
        rules = app.findRecordsByFilter(
          'categorization_rules',
          'family_id = "' + familyId + '"',
          '-created',
          500,
          0,
        )
      } catch (_) {
        continue
      }

      var seenKeys = {}

      for (var ri = 0; ri < rules.length; ri++) {
        var keyword = rules[ri].getString('keyword').toLowerCase()
        var matchType = rules[ri].getString('match_type')
        var key = keyword + '|' + matchType

        if (seenKeys[key]) {
          var dupKeyword = rules[ri].getString('keyword')
          var dupCatId = rules[ri].getString('category_id')
          console.log(
            'Removing duplicate rule: family=' +
              familyId +
              ' keyword=' +
              dupKeyword +
              ' category_id=' +
              dupCatId +
              ' (keeping newer rule with same keyword)',
          )
          app.delete(rules[ri])
          totalRemoved++
        } else {
          seenKeys[key] = true
        }
      }
    }

    console.log(
      'Deduplication complete: removed ' + totalRemoved + ' duplicate categorization rules',
    )
  },
  (app) => {
    console.log('Reverse migration for dedup not applicable - duplicates were already removed')
  },
)
