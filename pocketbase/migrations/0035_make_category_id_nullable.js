migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const field = col.fields.getByName('category_id')
    if (field) {
      field.required = false
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const field = col.fields.getByName('category_id')
    if (field) {
      field.required = true
    }
    app.save(col)
  },
)
