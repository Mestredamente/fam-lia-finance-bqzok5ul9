migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('debts')

    if (!col.fields.getByName('amortization_system')) {
      col.fields.add(
        new SelectField({
          name: 'amortization_system',
          values: ['PRICE', 'SAC', 'Livre'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('cet')) {
      col.fields.add(
        new NumberField({
          name: 'cet',
        }),
      )
    }

    if (!col.fields.getByName('financed_amount')) {
      col.fields.add(
        new NumberField({
          name: 'financed_amount',
        }),
      )
    }

    if (!col.fields.getByName('balance_due')) {
      col.fields.add(
        new NumberField({
          name: 'balance_due',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('debts')

    const f1 = col.fields.getByName('amortization_system')
    if (f1) col.fields.remove(f1)

    const f2 = col.fields.getByName('cet')
    if (f2) col.fields.remove(f2)

    const f3 = col.fields.getByName('financed_amount')
    if (f3) col.fields.remove(f3)

    const f4 = col.fields.getByName('balance_due')
    if (f4) col.fields.remove(f4)

    app.save(col)
  },
)
