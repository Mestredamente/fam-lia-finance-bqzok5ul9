migrate(
  (app) => {
    const invites = app.findCollectionByNameOrId('family_invites')

    if (!invites.fields.getByName('updated')) {
      invites.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
    }

    invites.listRule = "created_by = @request.auth.id || invite_code != ''"
    invites.viewRule = "created_by = @request.auth.id || invite_code != ''"
    invites.createRule = "@request.auth.id != ''"
    invites.updateRule = "@request.auth.id != ''"
    invites.deleteRule = 'created_by = @request.auth.id'

    app.save(invites)
  },
  (app) => {
    const invites = app.findCollectionByNameOrId('family_invites')
    invites.listRule = "@request.auth.id != ''"
    invites.viewRule = "@request.auth.id != ''"
    invites.createRule = "@request.auth.id != ''"
    invites.updateRule = "@request.auth.id != ''"
    invites.deleteRule = 'created_by = @request.auth.id'
    app.save(invites)
  },
)
