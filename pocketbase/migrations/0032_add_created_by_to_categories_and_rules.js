migrate(
  (app) => {
    var catCol = app.findCollectionByNameOrId('categories')
    if (!catCol.fields.getByName('created_by')) {
      catCol.fields.add(
        new RelationField({
          name: 'created_by',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    app.save(catCol)

    var rulesCol = app.findCollectionByNameOrId('categorization_rules')
    if (!rulesCol.fields.getByName('created_by')) {
      rulesCol.fields.add(
        new RelationField({
          name: 'created_by',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    app.save(rulesCol)
  },
  (app) => {
    var catCol = app.findCollectionByNameOrId('categories')
    var catField = catCol.fields.getByName('created_by')
    if (catField) {
      catCol.fields.remove(catField)
      app.save(catCol)
    }

    var rulesCol = app.findCollectionByNameOrId('categorization_rules')
    var ruleField = rulesCol.fields.getByName('created_by')
    if (ruleField) {
      rulesCol.fields.remove(ruleField)
      app.save(rulesCol)
    }
  },
)
