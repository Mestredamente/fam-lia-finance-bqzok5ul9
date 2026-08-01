migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('household_tasks')
    const rule =
      'family_id.created_by = @request.auth.id || assigned_to.user_id = @request.auth.id || created_by.user_id = @request.auth.id'
    col.listRule = rule
    col.viewRule = rule
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('household_tasks')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    app.save(col)
  },
)
