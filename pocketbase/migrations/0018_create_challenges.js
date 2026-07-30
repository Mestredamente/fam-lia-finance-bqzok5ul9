migrate(
  (app) => {
    var familiesId = app.findCollectionByNameOrId('families').id
    var membersId = app.findCollectionByNameOrId('members').id
    var collection = new Collection({
      name: 'challenges',
      type: 'base',
      listRule: 'user_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id',
      viewRule: 'user_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id',
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
          name: 'type',
          type: 'select',
          required: true,
          values: [
            'spending_freeze',
            'savings_goal',
            'no_impulse',
            'category_cut',
            'emotional_awareness',
            'custom',
          ],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'target_value', type: 'number', required: false },
        { name: 'current_value', type: 'number', required: false },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'completed', 'failed', 'abandoned'],
          maxSelect: 1,
        },
        { name: 'points', type: 'number', required: false, onlyInt: true },
        {
          name: 'badge_type',
          type: 'select',
          required: false,
          values: ['none', 'bronze', 'silver', 'gold', 'platinum'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_challenges_family_id ON challenges (family_id)',
        'CREATE INDEX idx_challenges_user_id ON challenges (user_id)',
        'CREATE INDEX idx_challenges_status ON challenges (status)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('challenges')
    app.delete(collection)
  },
)
