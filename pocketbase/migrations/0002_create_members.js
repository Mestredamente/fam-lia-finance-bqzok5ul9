migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const collection = new Collection({
      name: 'members',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
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
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['husband', 'wife', 'partner', 'child'],
          maxSelect: 1,
        },
        { name: 'display_name', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'monthly_income', type: 'number' },
        { name: 'payday', type: 'number', min: 1, max: 31 },
        { name: 'notify_bills', type: 'bool' },
        { name: 'notify_ai_tips', type: 'bool' },
        { name: 'share_data', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_members_user_family ON members (user_id, family_id)',
        'CREATE INDEX idx_members_family_id ON members (family_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('members')
    app.delete(collection)
  },
)
