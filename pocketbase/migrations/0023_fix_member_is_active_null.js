migrate(
  (app) => {
    app.db().newQuery('UPDATE members SET is_active = 1 WHERE is_active IS NULL').execute()
  },
  (app) => {},
)
