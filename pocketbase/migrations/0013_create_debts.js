migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const collection = new Collection({
      name: 'debts',
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
        { name: 'description', type: 'text', required: true, min: 2 },
        {
          name: 'type',
          type: 'select',
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
        },
        { name: 'total_amount', type: 'number', required: true, min: 0.01 },
        { name: 'remaining_amount', type: 'number', required: true, min: 0.01 },
        { name: 'installment_value', type: 'number', required: true, min: 0.01 },
        { name: 'installments_total', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'installments_paid', type: 'number', min: 0, onlyInt: true },
        { name: 'installments_remaining', type: 'number', required: true, min: 0, onlyInt: true },
        { name: 'interest_rate', type: 'number', required: true },
        { name: 'due_day', type: 'number', required: true, min: 1, max: 31, onlyInt: true },
        { name: 'start_date', type: 'date', required: true },
        { name: 'is_active', type: 'bool' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_debts_family_id ON debts (family_id)',
        'CREATE INDEX idx_debts_owner_id ON debts (owner_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('debts')
    app.delete(collection)
  },
)
