migrate(
  (app) => {
    // helper to load a collection by name
    function load(name) {
      return app.findCollectionByNameOrId(name)
    }

    // transactions
    var transactions = load('transactions')
    transactions.listRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    transactions.viewRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    transactions.updateRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    transactions.deleteRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    app.save(transactions)

    // invoices
    var invoices = load('invoices')
    invoices.listRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    invoices.viewRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    invoices.updateRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    invoices.deleteRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    app.save(invoices)

    // investments
    var investments = load('investments')
    investments.listRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    investments.viewRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    investments.updateRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    investments.deleteRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    app.save(investments)

    // debts
    var debts = load('debts')
    debts.listRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    debts.viewRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    debts.updateRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    debts.deleteRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'
    app.save(debts)

    // budgets — already permissive (auth-only); leave as-is.
  },
  (app) => {
    // no-op: the previous delete rules were permissive and the restore
    // would re-widen access, so we intentionally leave the tightened rules.
  },
)
