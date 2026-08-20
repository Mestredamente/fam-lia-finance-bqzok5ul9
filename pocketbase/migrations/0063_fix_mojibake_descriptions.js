migrate(
  (app) => {
    var db = app.db()

    // Pairs of [mojibake_substr, clean_char] to fix in database tables
    var replacements = [
      ['Ã§', 'ç'],
      ['Ã£', 'ã'],
      ['Ã©', 'é'],
      ['Ã¡', 'á'],
      ['Ã­', 'í'],
      ['Ã³', 'ó'],
      ['Ãº', 'ú'],
      ['Ã ', 'à'],
      ['Ã¢', 'â'],
      ['Ãª', 'ê'],
      ['Ã´', 'ô'],
      ['Ãµ', 'õ'],
      ['Ã¼', 'ü'],
      ['Ã€', 'À'],
      ['Ã', 'Á'],
      ['Ã‚', 'Â'],
      ['Ãƒ', 'Ã'],
      ['Ã‰', 'É'],
      ['ÃŠ', 'Ê'],
      ['Ã', 'Í'],
      ['Ã“', 'Ó'],
      ['Ã”', 'Ô'],
      ['Ã•', 'Õ'],
      ['Ãš', 'Ú'],
      ['Ã‡', 'Ç'],
    ]

    // 1. Fix transactions.description
    for (var i = 0; i < replacements.length; i++) {
      var searchStr = replacements[i][0]
      var replaceStr = replacements[i][1]
      db.newQuery(
        'UPDATE transactions SET description = replace(description, {:from}, {:to}) WHERE description LIKE {:pattern}',
      )
        .bind({
          from: searchStr,
          to: replaceStr,
          pattern: '%' + searchStr + '%',
        })
        .execute()
    }

    // 2. Fix invoice_items.description
    for (var j = 0; j < replacements.length; j++) {
      var sStr = replacements[j][0]
      var rStr = replacements[j][1]
      db.newQuery(
        'UPDATE invoice_items SET description = replace(description, {:from}, {:to}) WHERE description LIKE {:pattern}',
      )
        .bind({
          from: sStr,
          to: rStr,
          pattern: '%' + sStr + '%',
        })
        .execute()
    }

    // 3. Fix debts.description and recurring_transactions.description and categories.name if any
    for (var k = 0; k < replacements.length; k++) {
      var debtSearch = replacements[k][0]
      var debtReplace = replacements[k][1]
      db.newQuery(
        'UPDATE debts SET description = replace(description, {:from}, {:to}) WHERE description LIKE {:pattern}',
      )
        .bind({
          from: debtSearch,
          to: debtReplace,
          pattern: '%' + debtSearch + '%',
        })
        .execute()

      db.newQuery(
        'UPDATE recurring_transactions SET description = replace(description, {:from}, {:to}) WHERE description LIKE {:pattern}',
      )
        .bind({
          from: debtSearch,
          to: debtReplace,
          pattern: '%' + debtSearch + '%',
        })
        .execute()

      db.newQuery(
        'UPDATE categories SET name = replace(name, {:from}, {:to}) WHERE name LIKE {:pattern}',
      )
        .bind({
          from: debtSearch,
          to: debtReplace,
          pattern: '%' + debtSearch + '%',
        })
        .execute()
    }

    console.log(
      '[0063] Retroactive mojibake fix applied to transactions, invoice_items, debts, recurring_transactions, categories',
    )
  },
  (app) => {
    // Irreversible data sanitation migration
  },
)
