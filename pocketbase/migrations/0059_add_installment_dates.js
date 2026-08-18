migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('investments')

    // installment_due_day: dia de vencimento da parcela (1-31). Null/sentinel 0
    // significa "não parcelado" — o cron filtra installment_due_day = <hoje>,
    // onde hoje >= 1, então null/0 nunca casa.
    if (!col.fields.getByName('installment_due_day')) {
      col.fields.add(new NumberField({ name: 'installment_due_day', min: 0, max: 31 }))
    }

    // installment_start_date: data de início do parcelamento (date, nullable)
    if (!col.fields.getByName('installment_start_date')) {
      col.fields.add(new DateField({ name: 'installment_start_date' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('investments')
    var f1 = col.fields.getByName('installment_due_day')
    if (f1) col.fields.removeById(f1.id)
    var f2 = col.fields.getByName('installment_start_date')
    if (f2) col.fields.removeById(f2.id)
    app.save(col)
  },
)
