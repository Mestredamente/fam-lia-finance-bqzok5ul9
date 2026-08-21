migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('payment_date')) {
      col.fields.add(new DateField({ name: 'payment_date' }))
    }

    col.addIndex('idx_transactions_payment_date', false, 'payment_date', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const field = col.fields.getByName('payment_date')
    if (field) {
      col.fields.removeById(field.id)
    }
    col.removeIndex('idx_transactions_payment_date')
    app.save(col)
  },
)
