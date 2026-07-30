migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const categoriesId = app.findCollectionByNameOrId('categories').id

    const collection = new Collection({
      name: 'categorization_rules',
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
        { name: 'keyword', type: 'text', required: true, min: 1, max: 100 },
        {
          name: 'category_id',
          type: 'relation',
          required: true,
          collectionId: categoriesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'match_type',
          type: 'select',
          required: true,
          values: ['contains', 'starts_with'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_categorization_rules_family_id ON categorization_rules (family_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('categorization_rules')
    app.delete(collection)
  },
)
