migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('invoice_items')
    if (!col.fields.getByName('excluded')) {
      col.fields.add(new BoolField({ name: 'excluded' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('invoice_items')
    const field = col.fields.getByName('excluded')
    if (field) {
      col.fields.removeById(field.id)
    }
    app.save(col)
  },
)
