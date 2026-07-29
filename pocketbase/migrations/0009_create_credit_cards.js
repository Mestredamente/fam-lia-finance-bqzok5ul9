migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const collection = new Collection({
      name: 'credit_cards',
      type: 'base',
      listRule: 'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id',
      viewRule: 'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id',
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
        { name: 'name', type: 'text', required: true, min: 2 },
        {
          name: 'card_brand',
          type: 'select',
          required: true,
          values: ['Visa', 'Mastercard', 'Elo', 'Amex', 'Outros'],
          maxSelect: 1,
        },
        { name: 'closing_day', type: 'number', required: true, min: 1, max: 31, onlyInt: true },
        { name: 'due_day', type: 'number', required: true, min: 1, max: 31, onlyInt: true },
        { name: 'credit_limit', type: 'number' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_credit_cards_family_id ON credit_cards (family_id)',
        'CREATE INDEX idx_credit_cards_owner_id ON credit_cards (owner_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('credit_cards')
    app.delete(collection)
  },
)
