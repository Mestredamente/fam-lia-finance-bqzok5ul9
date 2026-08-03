migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('invoices')

    if (!col.fields.getByName('reviewed_at')) {
      col.fields.add(new DateField({ name: 'reviewed_at' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('invoices')

    var field = col.fields.getByName('reviewed_at')
    if (field) {
      col.fields.removeById(field.id)
    }

    app.save(col)
  },
)
