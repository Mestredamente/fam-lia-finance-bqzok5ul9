migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('invoice_items')
    var invoiceItemsId = app.findCollectionByNameOrId('invoice_items').id

    if (!col.fields.getByName('is_installment')) {
      col.fields.add(new BoolField({ name: 'is_installment' }))
    }

    if (!col.fields.getByName('installment_current')) {
      col.fields.add(new NumberField({ name: 'installment_current' }))
    }

    if (!col.fields.getByName('installment_total')) {
      col.fields.add(new NumberField({ name: 'installment_total' }))
    }

    if (!col.fields.getByName('parent_installment_id')) {
      col.fields.add(
        new RelationField({
          name: 'parent_installment_id',
          collectionId: invoiceItemsId,
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('invoice_items')

    var f1 = col.fields.getByName('is_installment')
    if (f1) col.fields.removeById(f1.id)
    var f2 = col.fields.getByName('installment_current')
    if (f2) col.fields.removeById(f2.id)
    var f3 = col.fields.getByName('installment_total')
    if (f3) col.fields.removeById(f3.id)
    var f4 = col.fields.getByName('parent_installment_id')
    if (f4) col.fields.removeById(f4.id)

    app.save(col)
  },
)
