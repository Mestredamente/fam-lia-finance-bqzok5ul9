migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const collection = new Collection({
      name: 'investments',
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
          name: 'type',
          type: 'select',
          required: true,
          values: ['cdb', 'tesouro', 'acoes', 'fii', 'poupanca', 'renda_fixa', 'cripto', 'outro'],
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true, min: 2 },
        { name: 'institution', type: 'text', required: true, min: 2 },
        { name: 'amount_invested', type: 'number', required: true, min: 0.01 },
        { name: 'current_value', type: 'number', required: true, min: 0.01 },
        { name: 'interest_rate', type: 'number' },
        {
          name: 'interest_type',
          type: 'select',
          values: ['cdi', 'fixed', 'ipca', 'prefixed'],
          maxSelect: 1,
        },
        { name: 'maturity_date', type: 'date' },
        { name: 'is_active', type: 'bool' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_investments_family_id ON investments (family_id)',
        'CREATE INDEX idx_investments_owner_id ON investments (owner_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('investments')
    app.delete(collection)
  },
)
