migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const collection = new Collection({
      name: 'categories',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['expense', 'income', 'investment', 'debt'],
          maxSelect: 1,
        },
        { name: 'icon', type: 'text' },
        { name: 'color', type: 'text' },
        { name: 'is_fixed', type: 'bool' },
        { name: 'is_custom', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_categories_family_id ON categories (family_id)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('categories')
    app.delete(collection)
  },
)
