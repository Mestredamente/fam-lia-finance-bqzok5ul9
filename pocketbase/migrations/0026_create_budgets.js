migrate(
  (app) => {
    const familiesCol = app.findCollectionByNameOrId('families')
    const categoriesCol = app.findCollectionByNameOrId('categories')
    const membersCol = app.findCollectionByNameOrId('members')

    const collection = new Collection({
      name: 'budgets',
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
          collectionId: familiesCol.id,
          maxSelect: 1,
        },
        {
          name: 'category_id',
          type: 'relation',
          required: true,
          collectionId: categoriesCol.id,
          maxSelect: 1,
        },
        {
          name: 'member_id',
          type: 'relation',
          required: false,
          collectionId: membersCol.id,
          maxSelect: 1,
        },
        { name: 'monthly_limit', type: 'number', required: true, min: 0 },
        { name: 'is_active', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_budgets_family_id ON budgets (family_id)',
        'CREATE INDEX idx_budgets_category_id ON budgets (category_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('budgets')
    app.delete(collection)
  },
)
