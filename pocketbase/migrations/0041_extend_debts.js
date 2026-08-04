migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('debts')
    var categoriesId = app.findCollectionByNameOrId('categories').id

    if (!col.fields.getByName('category_id')) {
      col.fields.add(
        new RelationField({
          name: 'category_id',
          collectionId: categoriesId,
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('end_date')) {
      col.fields.add(new DateField({ name: 'end_date' }))
    }

    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({
          name: 'status',
          values: ['active', 'paid_off', 'overdue'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('frequency')) {
      col.fields.add(
        new SelectField({
          name: 'frequency',
          values: ['monthly', 'yearly', 'weekly'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('auto_create_transaction')) {
      col.fields.add(new BoolField({ name: 'auto_create_transaction' }))
    }

    var typeField = col.fields.getByName('type')
    if (typeField) {
      col.fields.removeById(typeField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: [
          'financing',
          'loan',
          'credit_card',
          'financing_home',
          'financing_car',
          'personal_loan',
          'utility',
          'subscription',
          'rent',
          'condo',
          'other',
        ],
        maxSelect: 1,
      }),
    )

    app.save(col)

    app
      .db()
      .newQuery("UPDATE debts SET status = 'active' WHERE status IS NULL OR status = ''")
      .execute()
    app
      .db()
      .newQuery("UPDATE debts SET frequency = 'monthly' WHERE frequency IS NULL OR frequency = ''")
      .execute()
    app
      .db()
      .newQuery(
        'UPDATE debts SET auto_create_transaction = 1 WHERE auto_create_transaction IS NULL',
      )
      .execute()
  },
  (app) => {
    var col = app.findCollectionByNameOrId('debts')

    var f1 = col.fields.getByName('category_id')
    if (f1) col.fields.removeById(f1.id)
    var f2 = col.fields.getByName('end_date')
    if (f2) col.fields.removeById(f2.id)
    var f3 = col.fields.getByName('status')
    if (f3) col.fields.removeById(f3.id)
    var f4 = col.fields.getByName('frequency')
    if (f4) col.fields.removeById(f4.id)
    var f5 = col.fields.getByName('auto_create_transaction')
    if (f5) col.fields.removeById(f5.id)

    var typeField = col.fields.getByName('type')
    if (typeField) col.fields.removeById(typeField.id)
    col.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: [
          'financing',
          'loan',
          'credit_card',
          'financing_home',
          'financing_car',
          'personal_loan',
          'other',
        ],
        maxSelect: 1,
      }),
    )

    app.save(col)
  },
)
