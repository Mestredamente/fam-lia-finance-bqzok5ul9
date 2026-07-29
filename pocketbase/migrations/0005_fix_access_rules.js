migrate(
  (app) => {
    const families = app.findCollectionByNameOrId('families')
    families.listRule = 'created_by = @request.auth.id'
    families.viewRule = "@request.auth.id != ''"
    families.createRule = "@request.auth.id != ''"
    families.updateRule = 'created_by = @request.auth.id'
    families.deleteRule = 'created_by = @request.auth.id'
    app.save(families)

    const members = app.findCollectionByNameOrId('members')
    members.listRule = 'user_id = @request.auth.id || family_id.created_by = @request.auth.id'
    members.viewRule = 'user_id = @request.auth.id || family_id.created_by = @request.auth.id'
    members.createRule = 'user_id = @request.auth.id'
    members.updateRule = 'user_id = @request.auth.id'
    members.deleteRule = 'user_id = @request.auth.id || family_id.created_by = @request.auth.id'
    app.save(members)

    const invites = app.findCollectionByNameOrId('family_invites')
    invites.listRule = "@request.auth.id != ''"
    invites.viewRule = "@request.auth.id != ''"
    invites.createRule = "@request.auth.id != ''"
    invites.updateRule = "@request.auth.id != ''"
    invites.deleteRule = 'created_by = @request.auth.id'
    app.save(invites)
  },
  (app) => {
    const families = app.findCollectionByNameOrId('families')
    families.listRule = "@request.auth.id != ''"
    families.viewRule = "@request.auth.id != ''"
    families.createRule = "@request.auth.id != ''"
    families.updateRule = 'created_by = @request.auth.id'
    families.deleteRule = 'created_by = @request.auth.id'
    app.save(families)

    const members = app.findCollectionByNameOrId('members')
    members.listRule = "@request.auth.id != ''"
    members.viewRule = "@request.auth.id != ''"
    members.createRule = "@request.auth.id != ''"
    members.updateRule = 'user_id = @request.auth.id'
    members.deleteRule = 'user_id = @request.auth.id'
    app.save(members)

    const invites = app.findCollectionByNameOrId('family_invites')
    invites.listRule = "@request.auth.id != ''"
    invites.viewRule = "@request.auth.id != ''"
    invites.createRule = "@request.auth.id != ''"
    invites.updateRule = "@request.auth.id != ''"
    invites.deleteRule = 'created_by = @request.auth.id'
    app.save(invites)
  },
)
