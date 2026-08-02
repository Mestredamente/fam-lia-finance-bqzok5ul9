migrate(
  (app) => {
    const invoiceItemsId = app.findCollectionByNameOrId('invoice_items').id
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('invoice_item_id')) {
      col.fields.add(
        new RelationField({
          name: 'invoice_item_id',
          collectionId: invoiceItemsId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const field = col.fields.getByName('invoice_item_id')
    if (field) {
      col.fields.removeById(field.id)
    }
    app.save(col)
  },
)
