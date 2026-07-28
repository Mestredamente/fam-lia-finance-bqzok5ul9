migrate(
  (app) => {
    const collection = new Collection({
      name: 'families',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: 'created_by = @request.auth.id',
      deleteRule: 'created_by = @request.auth.id',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'invite_code', type: 'text', required: true },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_families_invite_code ON families (invite_code)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('families')
    app.delete(collection)
  },
)
