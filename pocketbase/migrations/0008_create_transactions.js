migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const categoriesId = app.findCollectionByNameOrId('categories').id
    const collection = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: 'owner_id.user_id = @request.auth.id',
      deleteRule: 'owner_id.user_id = @request.auth.id',
      fields: [
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'owner_id',
          type: 'relation',
          required: true,
          collectionId: membersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'category_id',
          type: 'relation',
          required: true,
          collectionId: categoriesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['expense', 'income', 'investment', 'debt_payment'],
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true, min: 0.01 },
        { name: 'description', type: 'text', required: true },
        { name: 'transaction_date', type: 'date', required: true },
        { name: 'is_shared', type: 'bool' },
        { name: 'is_fixed', type: 'bool' },
        {
          name: 'source',
          type: 'select',
          values: ['manual', 'invoice_import'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transactions_family_id ON transactions (family_id)',
        'CREATE INDEX idx_transactions_owner_id ON transactions (owner_id)',
        'CREATE INDEX idx_transactions_category_id ON transactions (category_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('transactions')
    app.delete(collection)
  },
)
