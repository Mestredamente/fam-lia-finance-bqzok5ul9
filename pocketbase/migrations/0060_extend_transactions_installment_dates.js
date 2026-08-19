// Adds installment_due_day and installment_start_date to transactions.
//
// These power the new "Parcelado" mode in TransactionFormSheet (Part 1.2):
//   - installment_due_day: 1-31, dia de vencimento de cada parcela.
//   - installment_start_date: data de início do parcelamento (yyyy-mm-dd).
// Both optional (existing rows simply have null, meaning "use transaction_date").
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('installment_due_day')) {
      col.fields.add(
        new NumberField({
          name: 'installment_due_day',
          required: false,
          onlyInt: true,
          min: 1,
          max: 31,
        }),
      )
    }

    if (!col.fields.getByName('installment_start_date')) {
      col.fields.add(
        new DateField({
          name: 'installment_start_date',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const f1 = col.fields.getByName('installment_due_day')
    if (f1) col.fields.remove(f1)
    const f2 = col.fields.getByName('installment_start_date')
    if (f2) col.fields.remove(f2)
    app.save(col)
  },
)
