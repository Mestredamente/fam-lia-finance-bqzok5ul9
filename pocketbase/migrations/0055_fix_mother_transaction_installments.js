// 0055 — Correção de integridade de dados:
//  BUG 1: transações "mãe" de parcelamento sem a flag is_installment marcada.
//  BUG 2: transaction_date corrompida (0002-11-30) em 5 transações "Saldo do dia".
//
// NOTA SOBRE A LIMPEZA COSMÉTICA (installment_current/total → NULL):
//   PocketBase v0.36 torna TODOS os campos number NOT NULL com zero-default
//   (docs: "All collection fields, with exception of the JSONField, are non-nullable
//   and use a zero-default for their respective type as fallback value"). Um
//   `UPDATE ... = NULL` falha com `NOT NULL constraint failed`, e qualquer write
//   via API coage NULL → 0. Portanto NÃO é possível persistir NULL nesses campos
//   neste backend; a limpeza cosmética foi omitida por impossibilidade de plataforma.
//
// Os updates abaixo rodam direto no banco (raw SQL) e portanto NÃO disparam hooks de
// beforeCreate/beforeUpdate — então a validação de data adicionada no hook
// `validate_transaction_date` não bloqueia esta correção.
migrate(
  (app) => {
    var db = app.db()

    // === BUG 1 — Mães de parcelamento sem flag ===
    // Mãe 1: b28zs4w77g0s40u (Raia Drogasil) — parcela 2 de 3
    db.newQuery(
      'UPDATE transactions SET is_installment = 1, installment_current = {:ic}, installment_total = {:it} WHERE id = {:id}',
    )
      .bind({ ic: 2, it: 3, id: 'b28zs4w77g0s40u' })
      .execute()

    // Mãe 2: 0s5y064xjk5ary7 (Psicoterapia) — parcela 7 de 12
    db.newQuery(
      'UPDATE transactions SET is_installment = 1, installment_current = {:ic}, installment_total = {:it} WHERE id = {:id}',
    )
      .bind({ ic: 7, it: 12, id: '0s5y064xjk5ary7' })
      .execute()

    // === BUG 2 — Datas corrompidas (0002-11-30) ===
    // 5 transações da família 3osacfebbxfgdjj (Gabriel) — "Saldo do dia".
    // transaction_date = data do `created` (2026-08-11), sem hora.
    db.newQuery(
      "UPDATE transactions SET transaction_date = '2026-08-11' " +
        "WHERE id IN ('qpaeas67pa9zmnn','83mofg5d6ax6kya','r2p4wdoi4ocrwka','g4owc8y92mf12fz','mip44dykqdaw2mv')",
    ).execute()
  },
  (app) => {
    var db = app.db()

    // Reverte BUG 1: mães voltam ao estado anterior corrompido (sem flag).
    db.newQuery(
      'UPDATE transactions SET is_installment = 0, installment_current = 0, installment_total = 0 ' +
        "WHERE id IN ('b28zs4w77g0s40u','0s5y064xjk5ary7')",
    ).execute()

    // Reverte BUG 2: volta a data corrompida original.
    db.newQuery(
      "UPDATE transactions SET transaction_date = '0002-11-30' " +
        "WHERE id IN ('qpaeas67pa9zmnn','83mofg5d6ax6kya','r2p4wdoi4ocrwka','g4owc8y92mf12fz','mip44dykqdaw2mv')",
    ).execute()
  },
)
