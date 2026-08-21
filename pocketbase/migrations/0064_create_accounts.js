migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const collection = new Collection({
      name: 'accounts',
      type: 'base',
      listRule: 'family_id.created_by = @request.auth.id || @request.auth.id != ""',
      viewRule: 'family_id.created_by = @request.auth.id || @request.auth.id != ""',
      createRule: "@request.auth.id != ''",
      updateRule: 'family_id.created_by = @request.auth.id || @request.auth.id != ""',
      deleteRule: 'family_id.created_by = @request.auth.id || @request.auth.id != ""',
      fields: [
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true, min: 1 },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['checking', 'savings', 'wallet', 'investment'],
          maxSelect: 1,
        },
        { name: 'bank', type: 'text' },
        { name: 'initial_balance', type: 'number' },
        { name: 'color', type: 'text' },
        { name: 'icon', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_accounts_family_id ON accounts (family_id)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('accounts')
    app.delete(collection)
  },
)
