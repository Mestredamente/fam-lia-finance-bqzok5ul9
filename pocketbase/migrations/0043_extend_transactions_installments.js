migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('transactions')
    var txId = app.findCollectionByNameOrId('transactions').id
    var debtsId = app.findCollectionByNameOrId('debts').id

    app
      .db()
      .newQuery(
        'CREATE TABLE IF NOT EXISTS _temp_source_backup AS SELECT id, source FROM transactions',
      )
      .execute()

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

    if (!col.fields.getByName('is_installment')) {
      col.fields.add(new BoolField({ name: 'is_installment' }))
    }

    if (!col.fields.getByName('installment_current')) {
      col.fields.add(new NumberField({ name: 'installment_current' }))
    }

    if (!col.fields.getByName('installment_total')) {
      col.fields.add(new NumberField({ name: 'installment_total' }))
    }

    if (!col.fields.getByName('parent_transaction_id')) {
      col.fields.add(
        new RelationField({
          name: 'parent_transaction_id',
          collectionId: txId,
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('debt_id')) {
      col.fields.add(
        new RelationField({
          name: 'debt_id',
          collectionId: debtsId,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)

    try {
      app
        .db()
        .newQuery(
          'UPDATE transactions SET source = (SELECT source FROM _temp_source_backup WHERE _temp_source_backup.id = transactions.id)',
        )
        .execute()
    } catch (_) {}

    try {
      app.db().newQuery('DROP TABLE _temp_source_backup').execute()
    } catch (_) {}
  },
  (app) => {
    var col = app.findCollectionByNameOrId('transactions')

    var sourceField = col.fields.getByName('source')
    if (sourceField) col.fields.removeById(sourceField.id)
    col.fields.add(
      new SelectField({
        name: 'source',
        values: ['manual', 'invoice_import'],
        maxSelect: 1,
      }),
    )

    var f1 = col.fields.getByName('is_installment')
    if (f1) col.fields.removeById(f1.id)
    var f2 = col.fields.getByName('installment_current')
    if (f2) col.fields.removeById(f2.id)
    var f3 = col.fields.getByName('installment_total')
    if (f3) col.fields.removeById(f3.id)
    var f4 = col.fields.getByName('parent_transaction_id')
    if (f4) col.fields.removeById(f4.id)
    var f5 = col.fields.getByName('debt_id')
    if (f5) col.fields.removeById(f5.id)

    app.save(col)
  },
)
