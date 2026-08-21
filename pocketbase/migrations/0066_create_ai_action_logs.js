migrate(
  (app) => {
    const familiesId = app.findCollectionByNameOrId('families').id
    const membersId = app.findCollectionByNameOrId('members').id
    const collection = new Collection({
      name: 'ai_action_logs',
      type: 'base',
      listRule: 'user_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id',
      viewRule: 'user_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: 'family_id.created_by = @request.auth.id',
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
          name: 'action_type',
          type: 'select',
          required: true,
          values: ['create_challenge', 'create_task'],
          maxSelect: 1,
        },
        {
          name: 'params',
          type: 'json',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['confirmed', 'cancelled', 'failed'],
          maxSelect: 1,
        },
        {
          name: 'created_record_id',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ai_action_logs_family ON ai_action_logs (family_id)',
        'CREATE INDEX idx_ai_action_logs_user ON ai_action_logs (user_id)',
        'CREATE INDEX idx_ai_action_logs_created ON ai_action_logs (created)',
        'CREATE INDEX idx_ai_action_logs_status ON ai_action_logs (status)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('ai_action_logs')
    app.delete(collection)
  },
)
