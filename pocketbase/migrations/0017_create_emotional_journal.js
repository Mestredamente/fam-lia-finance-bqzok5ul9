migrate(
  (app) => {
    var familiesId = app.findCollectionByNameOrId('families').id
    var membersId = app.findCollectionByNameOrId('members').id
    var transactionsId = app.findCollectionByNameOrId('transactions').id
    var collection = new Collection({
      name: 'emotional_journal',
      type: 'base',
      listRule: 'user_id.user_id = @request.auth.id',
      viewRule: 'user_id.user_id = @request.auth.id',
      createRule: 'user_id.user_id = @request.auth.id',
      updateRule: 'user_id.user_id = @request.auth.id',
      deleteRule: 'user_id.user_id = @request.auth.id',
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
          collectionId: membersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'transaction_id',
          type: 'relation',
          required: false,
          collectionId: transactionsId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'emotion',
          type: 'select',
          required: true,
          values: [
            'anxiety',
            'happiness',
            'guilt',
            'relief',
            'frustration',
            'pride',
            'fear',
            'impulse',
            'gratitude',
            'stress',
          ],
          maxSelect: 1,
        },
        { name: 'trigger', type: 'text', required: true, min: 2 },
        { name: 'note', type: 'text', required: false, max: 500 },
        { name: 'spending_amount', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_emotional_journal_user_id ON emotional_journal (user_id)',
        'CREATE INDEX idx_emotional_journal_family_id ON emotional_journal (family_id)',
        'CREATE INDEX idx_emotional_journal_created ON emotional_journal (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('emotional_journal')
    app.delete(collection)
  },
)
