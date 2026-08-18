migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('investments')

    // 1. Atualizar o select do campo `type` para incluir imovel, terreno, veiculo
    //    Mutar `.options` não é seguro no JSVM — remover e recriar o campo.
    var oldType = col.fields.getByName('type')
    if (oldType) {
      col.fields.removeById(oldType.id)
    }
    col.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: [
          'cdb',
          'tesouro',
          'acoes',
          'fii',
          'poupanca',
          'renda_fixa',
          'cripto',
          'imovel',
          'terreno',
          'veiculo',
          'outro',
        ],
        maxSelect: 1,
      }),
    )

    // 2. Novos campos (com guard para idempotência)
    const addField = (name, ctor) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(ctor)
      }
    }

    addField('down_payment', new NumberField({ name: 'down_payment', min: 0 }))
    addField('installment_value', new NumberField({ name: 'installment_value', min: 0 }))
    addField('installments_total', new NumberField({ name: 'installments_total', min: 0 }))
    addField('installments_paid', new NumberField({ name: 'installments_paid', min: 0 }))
    addField(
      'frequency',
      new SelectField({
        name: 'frequency',
        values: ['monthly', 'yearly', 'weekly'],
        maxSelect: 1,
      }),
    )
    addField('has_recurring_contribution', new BoolField({ name: 'has_recurring_contribution' }))
    addField('contribution_amount', new NumberField({ name: 'contribution_amount', min: 0 }))
    addField('contribution_day', new NumberField({ name: 'contribution_day', min: 1, max: 31 }))
    addField('contribution_start_date', new DateField({ name: 'contribution_start_date' }))
    addField('contribution_end_date', new DateField({ name: 'contribution_end_date' }))
    addField('generate_expense', new BoolField({ name: 'generate_expense' }))
    addField(
      'expense_category_id',
      new RelationField({
        name: 'expense_category_id',
        collectionId: app.findCollectionByNameOrId('categories').id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('investments')
    const names = [
      'down_payment',
      'installment_value',
      'installments_total',
      'installments_paid',
      'frequency',
      'has_recurring_contribution',
      'contribution_amount',
      'contribution_day',
      'contribution_start_date',
      'contribution_end_date',
      'generate_expense',
      'expense_category_id',
    ]
    names.forEach((n) => {
      var f = col.fields.getByName(n)
      if (f) col.fields.removeById(f.id)
    })
    // Reverter select do type
    var t = col.fields.getByName('type')
    if (t) col.fields.removeById(t.id)
    col.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: ['cdb', 'tesouro', 'acoes', 'fii', 'poupanca', 'renda_fixa', 'cripto', 'outro'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
)
