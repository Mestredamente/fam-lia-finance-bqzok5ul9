migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('members')

    if (!col.fields.getByName('avatar')) {
      col.fields.add(
        new FileField({
          name: 'avatar',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png'],
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('members')
    var field = col.fields.getByName('avatar')
    if (field) {
      col.fields.remove(field)
    }
    app.save(col)
  },
)
