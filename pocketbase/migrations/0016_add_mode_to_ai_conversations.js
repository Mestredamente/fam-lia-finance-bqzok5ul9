migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('ai_conversations')
    if (!col.fields.getByName('mode')) {
      col.fields.add(
        new SelectField({
          name: 'mode',
          values: ['chat', 'therapy'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)

    var records = []
    try {
      records = app.findRecordsByFilter(
        'ai_conversations',
        "mode = '' || mode = null",
        'created',
        1000,
        0,
      )
    } catch (_) {}
    for (var i = 0; i < records.length; i++) {
      records[i].set('mode', 'chat')
      app.save(records[i])
    }
  },
  (app) => {
    var col = app.findCollectionByNameOrId('ai_conversations')
    var field = col.fields.getByName('mode')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
