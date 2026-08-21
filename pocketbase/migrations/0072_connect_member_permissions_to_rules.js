migrate(
  (app) => {
    // Connect the (already-existing) member permission flags to the API read
    // rules of every family-scoped collection, so cross-member visibility is
    // gated on the viewer's per-family permission instead of just membership.
    //
    // NOTE: the `is_shared` field on transactions/recurring_transactions is
    // intentionally NOT removed — it remains an informational flag on the
    // record. We simply stop letting `is_shared = true` alone grant read
    // access to other family members; now the viewer must also have the
    // relevant permission flag (perm_view_others / perm_view_patrimony /
    // perm_view_budgets) on their own member row.
    //
    // Membership test + permission test, using @collection.members. ?= is the
    // "any/at-least-one-of" operator over the joined member rows. We match a
    // member row whose user_id is the authed user, whose family_id is the
    // record's family, AND whose permission flag is true. That proves the
    // viewer belongs to the family AND holds the permission.
    function memberOfFamilyWithPerm(familyIdField, permField) {
      return (
        '@collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= ' +
        familyIdField +
        ' && @collection.members.' +
        permField +
        ' ?= true'
      )
    }

    // 1. transactions — read: own OR member-of-family with perm_view_others
    //    OR family creator. (is_shared kept as informational only.)
    var transactions = app.findCollectionByNameOrId('transactions')
    var txReadRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_others') +
      ') || family_id.created_by = @request.auth.id'
    transactions.listRule = txReadRule
    transactions.viewRule = txReadRule
    app.save(transactions)

    // 2. invoices — read: family creator OR owner OR member-of-family with
    //    perm_view_others.
    var invoices = app.findCollectionByNameOrId('invoices')
    var invReadRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_others') +
      ')'
    invoices.listRule = invReadRule
    invoices.viewRule = invReadRule
    app.save(invoices)

    // 3. investments — read: own OR member-of-family with perm_view_patrimony
    //    OR family creator.
    var investments = app.findCollectionByNameOrId('investments')
    var invtReadRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_patrimony') +
      ') || family_id.created_by = @request.auth.id'
    investments.listRule = invtReadRule
    investments.viewRule = invtReadRule
    app.save(investments)

    // 4. debts — read: own OR member-of-family with perm_view_others OR
    //    family creator.
    var debts = app.findCollectionByNameOrId('debts')
    var debtsReadRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_others') +
      ') || family_id.created_by = @request.auth.id'
    debts.listRule = debtsReadRule
    debts.viewRule = debtsReadRule
    app.save(debts)

    // 5. credit_cards — read: own OR member-of-family with perm_view_others
    //    OR family creator.
    var creditCards = app.findCollectionByNameOrId('credit_cards')
    var ccReadRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_others') +
      ') || family_id.created_by = @request.auth.id'
    creditCards.listRule = ccReadRule
    creditCards.viewRule = ccReadRule
    app.save(creditCards)

    // 6. accounts — read: family creator OR member-of-family with
    //    perm_view_others. (Previously the rule was the overly-broad
    //    `@request.auth.id != ""`, which let any authed user read any family's
    //    accounts — this narrows it to the family scope.)
    var accounts = app.findCollectionByNameOrId('accounts')
    var accReadRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_others') +
      ')'
    accounts.listRule = accReadRule
    accounts.viewRule = accReadRule
    app.save(accounts)

    // 7. budgets — read: family creator OR member-of-family with
    //    perm_view_budgets.
    var budgets = app.findCollectionByNameOrId('budgets')
    var budReadRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_budgets') +
      ')'
    budgets.listRule = budReadRule
    budgets.viewRule = budReadRule
    app.save(budgets)

    // 8. recurring_transactions — read: own OR member-of-family with
    //    perm_view_others OR family creator. (shared kept as informational
    //    only.)
    var recurring = app.findCollectionByNameOrId('recurring_transactions')
    var recReadRule =
      'member_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_others') +
      ') || family_id.created_by = @request.auth.id'
    recurring.listRule = recReadRule
    recurring.viewRule = recReadRule
    app.save(recurring)

    // 9. future_installments — this "collection" is virtual: future
    //    installments are rows in `transactions` with
    //    source = "future_installment", so they are already covered by the
    //    transactions rule above. No separate collection exists.
  },
  (app) => {
    // no-op: restoring the previous rules would re-widen access in unintended
    // ways, so we intentionally leave the permission-gated rules.
  },
)
