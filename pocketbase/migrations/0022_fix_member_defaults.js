migrate(
  (app) => {
    app.db().newQuery('UPDATE members SET is_active = 1 WHERE is_active IS NULL').execute()
    app.db().newQuery('UPDATE members SET notify_bills = 1 WHERE notify_bills IS NULL').execute()
    app
      .db()
      .newQuery('UPDATE members SET notify_ai_tips = 0 WHERE notify_ai_tips IS NULL')
      .execute()
    app.db().newQuery('UPDATE members SET share_data = 0 WHERE share_data IS NULL').execute()
  },
  (app) => {},
)
