// Extends the `transactions` collection to link transactions generated from
// recurring_transactions:
//  - adds optional `recurring_id` relation -> recurring_transactions
//  - adds 'recurring' to the `source` select values
// Transactions generated from recorrentes use source='recurring' and recurring_id,
// distinct from source='recurring_debt' / debt_id (installment-based debts).
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('transactions')
    var recurringId = app.findCollectionByNameOrId('recurring_transactions').id

    if (!col.fields.getByName('recurring_id')) {
      col.fields.add(
        new RelationField({
          name: 'recurring_id',
          collectionId: recurringId,
          maxSelect: 1,
        }),
      )
    }

    // Replace the `source` select to include 'recurring'.
    var sourceField = col.fields.getByName('source')
    if (sourceField) {
      col.fields.removeById(sourceField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'source',
        values: ['manual', 'invoice_import', 'recurring_debt', 'future_installment', 'recurring'],
        maxSelect: 1,
      }),
    )

    app.save(col)

    if (!app.tableIndexes('transactions')['idx_transactions_recurring_id']) {
      col.addIndex('idx_transactions_recurring_id', false, 'recurring_id', '')
      app.save(col)
    }
  },
  (app) => {
    var col = app.findCollectionByNameOrId('transactions')

    var f = col.fields.getByName('recurring_id')
    if (f) col.fields.removeById(f.id)

    var sourceField = col.fields.getByName('source')
    if (sourceField) {
      col.fields.removeById(sourceField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'source',
        values: ['manual', 'invoice_import', 'recurring_debt', 'future_installment'],
        maxSelect: 1,
      }),
    )

    app.save(col)
  },
)
