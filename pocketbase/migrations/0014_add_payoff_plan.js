migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('families')
    if (!col.fields.getByName('payoff_plan')) {
      col.fields.add(new JSONField({ name: 'payoff_plan' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('families')
    const field = col.fields.getByName('payoff_plan')
    if (field) col.fields.remove(field)
    app.save(col)
  },
)
