migrate(
  (app) => {
    const invoicesId = app.findCollectionByNameOrId('invoices').id
    const familiesId = app.findCollectionByNameOrId('families').id
    const categoriesId = app.findCollectionByNameOrId('categories').id
    const transactionsId = app.findCollectionByNameOrId('transactions').id
    const collection = new Collection({
      name: 'invoice_items',
      type: 'base',
      listRule: 'family_id.created_by = @request.auth.id',
      viewRule: 'family_id.created_by = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'invoice_id',
          type: 'relation',
          required: true,
          collectionId: invoicesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'transaction_date', type: 'date' },
        {
          name: 'suggested_category_id',
          type: 'relation',
          collectionId: categoriesId,
          maxSelect: 1,
        },
        {
          name: 'confirmed_category_id',
          type: 'relation',
          collectionId: categoriesId,
          maxSelect: 1,
        },
        { name: 'is_confirmed', type: 'bool' },
        {
          name: 'converted_transaction_id',
          type: 'relation',
          collectionId: transactionsId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id)',
        'CREATE INDEX idx_invoice_items_family_id ON invoice_items (family_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('invoice_items')
    app.delete(collection)
  },
)
