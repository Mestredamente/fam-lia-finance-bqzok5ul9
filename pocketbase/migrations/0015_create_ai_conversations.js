migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const collection = new Collection({
      name: 'ai_conversations',
      type: 'base',
      listRule: 'user_id.user_id = @request.auth.id',
      viewRule: 'user_id.user_id = @request.auth.id',
      createRule: 'user_id.user_id = @request.auth.id',
      updateRule: null,
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
          name: 'role',
          type: 'select',
          required: true,
          values: ['user', 'assistant'],
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ai_conversations_family_id ON ai_conversations (family_id)',
        'CREATE INDEX idx_ai_conversations_user_id ON ai_conversations (user_id)',
        'CREATE INDEX idx_ai_conversations_user_created ON ai_conversations (user_id, created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('ai_conversations')
    app.delete(collection)
  },
)
