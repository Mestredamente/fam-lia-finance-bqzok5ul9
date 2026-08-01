migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('invoices')

    var statusField = col.fields.getByName('status')
    if (statusField) {
      col.fields.removeById(statusField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'status',
        values: ['pending', 'reviewed', 'paid', 'parsed', 'error'],
        maxSelect: 1,
      }),
    )

    var fileField = col.fields.getByName('raw_file_url')
    if (fileField) {
      col.fields.removeById(fileField.id)
    }
    col.fields.add(
      new FileField({
        name: 'raw_file_url',
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('invoices')

    var statusField = col.fields.getByName('status')
    if (statusField) {
      col.fields.removeById(statusField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'status',
        values: ['pending', 'reviewed', 'paid'],
        maxSelect: 1,
      }),
    )

    var fileField = col.fields.getByName('raw_file_url')
    if (fileField) {
      col.fields.removeById(fileField.id)
    }
    col.fields.add(
      new FileField({
        name: 'raw_file_url',
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      }),
    )

    app.save(col)
  },
)
