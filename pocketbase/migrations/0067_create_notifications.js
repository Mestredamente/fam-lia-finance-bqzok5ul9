migrate(
  (app) => {
    var familiesId = app.findCollectionByNameOrId('families').id
    var usersId = '_pb_users_auth_'

    var collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule:
        "family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id || (user_id != '' && user_id = @request.auth.id)",
      viewRule:
        "family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id || (user_id != '' && user_id = @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id || (user_id != '' && user_id = @request.auth.id)",
      deleteRule:
        "family_id.created_by = @request.auth.id || @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id || (user_id != '' && user_id = @request.auth.id)",
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
          required: false,
          collectionId: usersId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'message',
          type: 'text',
          required: true,
        },
        {
          name: 'is_read',
          type: 'bool',
          required: false,
        },
        {
          name: 'metadata',
          type: 'json',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notifications_family_id ON notifications (family_id)',
        'CREATE INDEX idx_notifications_type ON notifications (type)',
        'CREATE INDEX idx_notifications_is_read ON notifications (is_read)',
        'CREATE INDEX idx_notifications_created ON notifications (created)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('notifications')
    app.delete(collection)
  },
)
