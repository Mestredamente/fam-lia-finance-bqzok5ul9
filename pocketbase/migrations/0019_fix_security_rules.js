migrate(
  (app) => {
    var FO = 'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id'

    var invites = app.findCollectionByNameOrId('family_invites')
    invites.listRule = 'created_by = @request.auth.id'
    invites.viewRule = 'created_by = @request.auth.id'
    app.save(invites)

    var categories = app.findCollectionByNameOrId('categories')
    categories.createRule = 'family_id.created_by = @request.auth.id'
    categories.updateRule = 'family_id.created_by = @request.auth.id'
    categories.deleteRule = 'family_id.created_by = @request.auth.id'
    app.save(categories)

    var transactions = app.findCollectionByNameOrId('transactions')
    transactions.listRule = FO
    transactions.viewRule = FO
    transactions.createRule = FO
    transactions.updateRule = FO
    transactions.deleteRule = FO
    app.save(transactions)

    var creditCards = app.findCollectionByNameOrId('credit_cards')
    creditCards.createRule = FO
    creditCards.updateRule = FO
    creditCards.deleteRule = FO
    app.save(creditCards)

    var invoices = app.findCollectionByNameOrId('invoices')
    invoices.createRule = FO
    invoices.updateRule = FO
    invoices.deleteRule = FO
    app.save(invoices)

    var invoiceItems = app.findCollectionByNameOrId('invoice_items')
    invoiceItems.createRule = 'family_id.created_by = @request.auth.id'
    invoiceItems.updateRule =
      'family_id.created_by = @request.auth.id || invoice_id.owner_id.user_id = @request.auth.id'
    invoiceItems.deleteRule =
      'family_id.created_by = @request.auth.id || invoice_id.owner_id.user_id = @request.auth.id'
    app.save(invoiceItems)

    var investments = app.findCollectionByNameOrId('investments')
    investments.listRule = FO
    investments.viewRule = FO
    investments.createRule = FO
    investments.updateRule = FO
    investments.deleteRule = FO
    app.save(investments)

    var debts = app.findCollectionByNameOrId('debts')
    debts.listRule = FO
    debts.viewRule = FO
    debts.createRule = FO
    debts.updateRule = FO
    debts.deleteRule = FO
    app.save(debts)
  },
  (app) => {
    var invites = app.findCollectionByNameOrId('family_invites')
    invites.listRule = "created_by = @request.auth.id || invite_code != ''"
    invites.viewRule = "created_by = @request.auth.id || invite_code != ''"
    app.save(invites)

    var categories = app.findCollectionByNameOrId('categories')
    categories.createRule = "@request.auth.id != ''"
    categories.updateRule = "@request.auth.id != ''"
    categories.deleteRule = "@request.auth.id != ''"
    app.save(categories)

    var transactions = app.findCollectionByNameOrId('transactions')
    transactions.listRule = "@request.auth.id != ''"
    transactions.viewRule = "@request.auth.id != ''"
    transactions.createRule = "@request.auth.id != ''"
    transactions.updateRule = 'owner_id.user_id = @request.auth.id'
    transactions.deleteRule = 'owner_id.user_id = @request.auth.id'
    app.save(transactions)

    var creditCards = app.findCollectionByNameOrId('credit_cards')
    creditCards.createRule = "@request.auth.id != ''"
    creditCards.updateRule = 'owner_id.user_id = @request.auth.id'
    creditCards.deleteRule = 'owner_id.user_id = @request.auth.id'
    app.save(creditCards)

    var invoices = app.findCollectionByNameOrId('invoices')
    invoices.createRule = "@request.auth.id != ''"
    invoices.updateRule = 'owner_id.user_id = @request.auth.id'
    invoices.deleteRule = 'owner_id.user_id = @request.auth.id'
    app.save(invoices)

    var invoiceItems = app.findCollectionByNameOrId('invoice_items')
    invoiceItems.createRule = "@request.auth.id != ''"
    invoiceItems.updateRule = "@request.auth.id != ''"
    invoiceItems.deleteRule = "@request.auth.id != ''"
    app.save(invoiceItems)

    var investments = app.findCollectionByNameOrId('investments')
    investments.listRule = "@request.auth.id != ''"
    investments.viewRule = "@request.auth.id != ''"
    investments.createRule = "@request.auth.id != ''"
    investments.updateRule = 'owner_id.user_id = @request.auth.id'
    investments.deleteRule = 'owner_id.user_id = @request.auth.id'
    app.save(investments)

    var debts = app.findCollectionByNameOrId('debts')
    debts.listRule = "@request.auth.id != ''"
    debts.viewRule = "@request.auth.id != ''"
    debts.createRule = "@request.auth.id != ''"
    debts.updateRule = 'owner_id.user_id = @request.auth.id'
    debts.deleteRule = 'owner_id.user_id = @request.auth.id'
    app.save(debts)
  },
)
