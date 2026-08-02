migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('purchase_date')) {
      col.fields.add(new DateField({ name: 'purchase_date' }))
    }

    col.addIndex('idx_transactions_transaction_date', false, 'transaction_date', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const field = col.fields.getByName('purchase_date')
    if (field) {
      col.fields.removeById(field.id)
    }
    col.removeIndex('idx_transactions_transaction_date')
    app.save(col)
  },
)
