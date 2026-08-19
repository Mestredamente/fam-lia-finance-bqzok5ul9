migrate(
  (app) => {
    // ── invoices: add 'partial' to status, plus partial_amount + paid_at ──
    var invCol = app.findCollectionByNameOrId('invoices')

    var invStatus = invCol.fields.getByName('status')
    if (invStatus) {
      invCol.fields.removeById(invStatus.id)
    }
    invCol.fields.add(
      new SelectField({
        name: 'status',
        values: ['pending', 'reviewed', 'paid', 'parsed', 'error', 'partial'],
        maxSelect: 1,
      }),
    )

    if (!invCol.fields.getByName('partial_amount')) {
      invCol.fields.add(new NumberField({ name: 'partial_amount' }))
    }
    if (!invCol.fields.getByName('paid_at')) {
      invCol.fields.add(new DateField({ name: 'paid_at' }))
    }
    app.save(invCol)

    // ── transactions: invoice_id + card_id relations ──
    var txCol = app.findCollectionByNameOrId('transactions')
    var invId = app.findCollectionByNameOrId('invoices').id
    var cardsId = app.findCollectionByNameOrId('credit_cards').id

    if (!txCol.fields.getByName('invoice_id')) {
      txCol.fields.add(
        new RelationField({
          name: 'invoice_id',
          collectionId: invId,
          maxSelect: 1,
        }),
      )
    }
    if (!txCol.fields.getByName('card_id')) {
      txCol.fields.add(
        new RelationField({
          name: 'card_id',
          collectionId: cardsId,
          maxSelect: 1,
        }),
      )
    }
    app.save(txCol)
  },
  (app) => {
    var invCol = app.findCollectionByNameOrId('invoices')

    var invStatus = invCol.fields.getByName('status')
    if (invStatus) {
      invCol.fields.removeById(invStatus.id)
    }
    invCol.fields.add(
      new SelectField({
        name: 'status',
        values: ['pending', 'reviewed', 'paid', 'parsed', 'error'],
        maxSelect: 1,
      }),
    )

    var pa = invCol.fields.getByName('partial_amount')
    if (pa) invCol.fields.removeById(pa.id)
    var pd = invCol.fields.getByName('paid_at')
    if (pd) invCol.fields.removeById(pd.id)
    app.save(invCol)

    var txCol = app.findCollectionByNameOrId('transactions')
    var ti = txCol.fields.getByName('invoice_id')
    if (ti) txCol.fields.removeById(ti.id)
    var tc = txCol.fields.getByName('card_id')
    if (tc) txCol.fields.removeById(tc.id)
    app.save(txCol)
  },
)
