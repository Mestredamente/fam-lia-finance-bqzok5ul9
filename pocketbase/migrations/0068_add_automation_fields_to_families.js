migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('families')

    if (!col.fields.getByName('auto_weekly_summary')) {
      col.fields.add(new BoolField({ name: 'auto_weekly_summary' }))
    }
    if (!col.fields.getByName('auto_budget_alert')) {
      col.fields.add(new BoolField({ name: 'auto_budget_alert' }))
    }
    if (!col.fields.getByName('auto_challenge_expiry')) {
      col.fields.add(new BoolField({ name: 'auto_challenge_expiry' }))
    }
    if (!col.fields.getByName('auto_weekly_insights')) {
      col.fields.add(new BoolField({ name: 'auto_weekly_insights' }))
    }

    app.save(col)

    // Set default true for existing families
    try {
      app
        .db()
        .newQuery(`
        UPDATE families SET
          auto_weekly_summary = COALESCE(auto_weekly_summary, 1),
          auto_budget_alert = COALESCE(auto_budget_alert, 1),
          auto_challenge_expiry = COALESCE(auto_challenge_expiry, 1),
          auto_weekly_insights = COALESCE(auto_weekly_insights, 1)
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    var col = app.findCollectionByNameOrId('families')
    var fieldNames = [
      'auto_weekly_summary',
      'auto_budget_alert',
      'auto_challenge_expiry',
      'auto_weekly_insights',
    ]
    for (var i = 0; i < fieldNames.length; i++) {
      var field = col.fields.getByName(fieldNames[i])
      if (field) col.fields.remove(field)
    }
    app.save(col)
  },
)
