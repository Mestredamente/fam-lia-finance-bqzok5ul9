// 0057 — Integração Patrimônio ↔ Transações.
//
// Permite que o cadastro de um investimento gere (opcionalmente) uma despesa no
// fluxo de caixa. Para isso:
//   a) Adiciona o campo `investment_id` (relation -> investments, opcional) à
//      coleção `transactions`, para ligar a despesa gerada ao investimento.
//   b) Adiciona o valor 'investment' ao select `source`, marcando transações
//      criadas a partir do cadastro de um investimento.
//   c) Adiciona 'investment' também ao select `type` da coleção `categories`
//      (já existe), e nada muda aqui — categorias de investimento já existem.
//
// A consistência de investimento do Financial Score passa a contar meses com
// transações cujo source='investment' ou investment_id preenchido.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('transactions')
    var investmentsId = app.findCollectionByNameOrId('investments').id

    // a) Campo investment_id (relation -> investments, opcional)
    if (!col.fields.getByName('investment_id')) {
      col.fields.add(
        new RelationField({
          name: 'investment_id',
          collectionId: investmentsId,
          maxSelect: 1,
        }),
      )
    }

    // b) Reescreve o select `source` para incluir 'investment'
    var sourceField = col.fields.getByName('source')
    if (sourceField) {
      col.fields.removeById(sourceField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'source',
        values: [
          'manual',
          'invoice_import',
          'recurring_debt',
          'future_installment',
          'recurring',
          'debt_payment',
          'investment',
        ],
        maxSelect: 1,
      }),
    )

    app.save(col)

    // Índice para acelerar buscas por investimento
    if (!app.tableIndexes('transactions')['idx_transactions_investment_id']) {
      col.addIndex('idx_transactions_investment_id', false, 'investment_id', '')
      app.save(col)
    }
  },
  (app) => {
    var col = app.findCollectionByNameOrId('transactions')

    var f = col.fields.getByName('investment_id')
    if (f) col.fields.removeById(f.id)

    var sourceField = col.fields.getByName('source')
    if (sourceField) {
      col.fields.removeById(sourceField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'source',
        values: [
          'manual',
          'invoice_import',
          'recurring_debt',
          'future_installment',
          'recurring',
          'debt_payment',
        ],
        maxSelect: 1,
      }),
    )

    app.save(col)

    if (app.tableIndexes('transactions')['idx_transactions_investment_id']) {
      col.removeIndex('idx_transactions_investment_id')
      app.save(col)
    }
  },
)
