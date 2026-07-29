migrate(
  (app) => {
    const creditCardsId = app.findCollectionByNameOrId('credit_cards').id
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const collection = new Collection({
      name: 'invoices',
      type: 'base',
      listRule: 'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id',
      viewRule: 'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: 'owner_id.user_id = @request.auth.id',
      deleteRule: 'owner_id.user_id = @request.auth.id',
      fields: [
        {
          name: 'card_id',
          type: 'relation',
          required: true,
          collectionId: creditCardsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          cascadeDelete: false,
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
        { name: 'month_ref', type: 'date', required: true },
        { name: 'total_amount', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'reviewed', 'paid'],
          maxSelect: 1,
        },
        {
          name: 'raw_file_url',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        { name: 'parsed_data', type: 'text' },
        { name: 'parsed_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_invoices_card_id ON invoices (card_id)',
        'CREATE INDEX idx_invoices_family_id ON invoices (family_id)',
        'CREATE INDEX idx_invoices_owner_id ON invoices (owner_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('invoices')
    app.delete(collection)
  },
)
