// 0056 — Unificação dos tipos de transação.
//
// Transações passam a ter apenas 2 tipos: 'expense' (Despesa) e 'income' (Receita).
// Investimentos e Dívidas agora vivem exclusivamente em Patrimônio (collections
// `investments` e `debts`).
//
// Passos:
//   a) Reescreve o `source` select para incluir 'debt_payment' (marcador de que a
//      transação foi gerada pelo fluxo de pagamento de dívida).
//   b) Migra transações existentes: 'investment' e 'debt_payment' viram 'expense',
//      preservando o contexto original em `emotion_note`.
//   c) Reescreve o `type` select para apenas ['expense','income'].
//   d) Safety net: UPDATE final garante que nenhuma transação ficou com type inválido.
//
// Os updates rodam direto no banco (raw SQL) e portanto NÃO disparam hooks de
// beforeCreate/beforeUpdate — a validação adicionada no hook
// `validate_transaction_type` não bloqueia esta correção.
migrate(
  (app) => {
    var db = app.db()
    var col = app.findCollectionByNameOrId('transactions')

    // ── a) Adiciona 'debt_payment' ao select `source` ────────────────────────
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

    // ── b) Migra transações legadas ──────────────────────────────────────────
    // 'investment' -> 'expense' + nota em emotion_note
    db.newQuery(
      'UPDATE transactions SET emotion_note = ' +
        "COALESCE('Originalmente cadastrada como investimento. ' || " +
        "NULLIF(emotion_note, ''), 'Originalmente cadastrada como investimento. ') " +
        "WHERE type = 'investment'",
    ).execute()
    db.newQuery("UPDATE transactions SET type = 'expense' WHERE type = 'investment'").execute()

    // 'debt_payment' -> 'expense' + nota em emotion_note (mantém debt_id)
    db.newQuery(
      'UPDATE transactions SET emotion_note = ' +
        "COALESCE('Originalmente cadastrada como pagamento de dívida. ' || " +
        "NULLIF(emotion_note, ''), 'Originalmente cadastrada como pagamento de dívida. ') " +
        "WHERE type = 'debt_payment'",
    ).execute()
    db.newQuery("UPDATE transactions SET type = 'expense' WHERE type = 'debt_payment'").execute()

    // ── c) Reescreve o select `type` para apenas expense/income ──────────────
    var typeField = col.fields.getByName('type')
    if (typeField) {
      col.fields.removeById(typeField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'type',
        values: ['expense', 'income'],
        maxSelect: 1,
      }),
    )
    app.save(col)

    // ── d) Safety net ────────────────────────────────────────────────────────
    db.newQuery(
      "UPDATE transactions SET type = 'expense' WHERE type NOT IN ('expense', 'income')",
    ).execute()
  },
  (app) => {
    var db = app.db()
    var col = app.findCollectionByNameOrId('transactions')

    // Reverte o select `type` para o estado anterior (4 valores).
    var typeField = col.fields.getByName('type')
    if (typeField) {
      col.fields.removeById(typeField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'type',
        values: ['expense', 'income', 'investment', 'debt_payment'],
        maxSelect: 1,
      }),
    )

    // Reverte o select `source` (remove 'debt_payment').
    var sourceField = col.fields.getByName('source')
    if (sourceField) {
      col.fields.removeById(sourceField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'source',
        values: ['manual', 'invoice_import', 'recurring_debt', 'future_installment', 'recurring'],
        maxSelect: 1,
      }),
    )
    app.save(col)

    // Não há como reverter os textos concatenados em emotion_note de forma segura
    // (podem já conter notas legítimas); deixamos como estão no down.
  },
)
