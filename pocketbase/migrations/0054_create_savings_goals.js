// Creates the `savings_goals` collection: family savings goals (emergency
// fund, travel, car, etc.) with target/current amounts, deadline, color/icon
// and status (active | completed | paused). Access rules follow the same
// pattern as recurring_transactions (migration 0052): the family creator and
// any member of the same family can create/view/edit/delete goals.
migrate(
  (app) => {
    var familiesId = app.findCollectionByNameOrId('families').id
    var categoriesId = app.findCollectionByNameOrId('categories').id
    var usersId = '_pb_users_auth_'

    var collection = new Collection({
      name: 'savings_goals',
      type: 'base',
      listRule:
        'family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id',
      viewRule:
        'family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id',
      createRule:
        'family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id',
      updateRule:
        'family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id',
      deleteRule:
        'family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id',
      fields: [
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'target_amount', type: 'number', required: true, min: 0 },
        { name: 'current_amount', type: 'number', min: 0 },
        { name: 'deadline', type: 'date' },
        { name: 'category_id', type: 'relation', collectionId: categoriesId, maxSelect: 1 },
        { name: 'color', type: 'text' },
        { name: 'icon', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'completed', 'paused'],
          maxSelect: 1,
        },
        { name: 'created_by', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'completed_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_savings_goals_family_id ON savings_goals (family_id)',
        'CREATE INDEX idx_savings_goals_status ON savings_goals (status)',
        'CREATE INDEX idx_savings_goals_deadline ON savings_goals (deadline)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('savings_goals')
    app.delete(collection)
  },
)
