migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({
          name: 'status',
          values: ['pending', 'paid'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const field = col.fields.getByName('status')
    if (field) {
      col.fields.removeById(field.id)
    }
    app.save(col)
  },
)
