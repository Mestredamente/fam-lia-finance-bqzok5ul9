// Adds an optional emotion + emotion_note to transactions, so each purchase can
// be tagged with how the user felt about it (links to the emotional journal idea).
//
// The live DB already has these columns (applied out-of-band). This migration is
// written idempotently so it is safe to re-apply: it only adds the fields when
// they are missing.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('emotion')) {
      col.fields.add(
        new SelectField({
          name: 'emotion',
          required: false,
          values: ['happy', 'necessary', 'regret', 'impulsive', 'neutral'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('emotion_note')) {
      col.fields.add(
        new TextField({
          name: 'emotion_note',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    const emotion = col.fields.getByName('emotion')
    if (emotion) col.fields.remove(emotion)

    const note = col.fields.getByName('emotion_note')
    if (note) col.fields.remove(note)

    app.save(col)
  },
)
