migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const transactionsId = app.findCollectionByNameOrId('transactions').id

    const collection = new Collection({
      name: 'household_tasks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        'family_id.created_by = @request.auth.id || assigned_to.user_id = @request.auth.id || created_by.user_id = @request.auth.id',
      deleteRule:
        'family_id.created_by = @request.auth.id || created_by.user_id = @request.auth.id',
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
          name: 'assigned_to',
          type: 'relation',
          required: false,
          collectionId: membersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: membersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true, min: 3, max: 200 },
        { name: 'description', type: 'text', required: false, max: 500 },
        {
          name: 'category',
          type: 'select',
          required: false,
          values: [
            'maintenance',
            'repair',
            'purchase',
            'appointment',
            'deadline',
            'subscription_review',
            'planning',
            'other',
          ],
          maxSelect: 1,
        },
        {
          name: 'priority',
          type: 'select',
          required: false,
          values: ['low', 'medium', 'high', 'urgent'],
          maxSelect: 1,
        },
        { name: 'estimated_cost', type: 'number', required: false, min: 0 },
        { name: 'actual_cost', type: 'number', required: false, min: 0 },
        { name: 'due_date', type: 'date', required: false },
        { name: 'completed_at', type: 'date', required: false },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['pending', 'in_progress', 'completed', 'cancelled'],
          maxSelect: 1,
        },
        {
          name: 'converted_transaction_id',
          type: 'relation',
          required: false,
          collectionId: transactionsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'is_recurring', type: 'bool' },
        {
          name: 'recurrence_pattern',
          type: 'select',
          required: false,
          values: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'],
          maxSelect: 1,
        },
        { name: 'shopping_items', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_household_tasks_family_id ON household_tasks (family_id)',
        'CREATE INDEX idx_household_tasks_assigned_to ON household_tasks (assigned_to)',
        'CREATE INDEX idx_household_tasks_status ON household_tasks (status)',
        'CREATE INDEX idx_household_tasks_due_date ON household_tasks (due_date)',
        'CREATE INDEX idx_household_tasks_created ON household_tasks (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('household_tasks')
    app.delete(collection)
  },
)
