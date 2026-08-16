migrate(
  (app) => {
    var familyId = '0m4ktollc2mgxy7'

    // 1. Mark all non-shared transactions in the Tutya family as shared.
    //    This fixes Lidia's visibility: ~95% of the family's transactions were
    //    created before the sharing logic existed and have is_shared=false, so
    //    the bidirectional access rules (migration 0048) hide them from her.
    app
      .db()
      .newQuery(
        'UPDATE transactions SET is_shared = true WHERE family_id = {:familyId} AND is_shared = false',
      )
      .bind({ familyId: familyId })
      .execute()

    // 2. Cover rows where is_shared is NULL (older rows predating the column
    //    default). Idempotent — re-running affects zero rows once fixed.
    app
      .db()
      .newQuery(
        'UPDATE transactions SET is_shared = true WHERE family_id = {:familyId} AND is_shared IS NULL',
      )
      .bind({ familyId: familyId })
      .execute()

    // 3. Defensive: ensure no NULLs remain for this family.
    app
      .db()
      .newQuery(
        'UPDATE transactions SET is_shared = true WHERE family_id = {:familyId} AND is_shared IS NULL',
      )
      .bind({ familyId: familyId })
      .execute()

    console.log('[0049] Marked all transactions is_shared=true for family ' + familyId)
  },
  (app) => {
    // Best-effort revert: we cannot know which rows were originally shared, so
    // this only un-shares transactions that have no explicit owner relationship
    // to a co-member would be unsafe; instead we leave them shared (no-op) to
    // avoid hiding data that members legitimately rely on.
  },
)
