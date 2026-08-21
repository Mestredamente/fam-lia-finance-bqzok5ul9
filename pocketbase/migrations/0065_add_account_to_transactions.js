migrate(
  (app) => {
    const accountsId = app.findCollectionByNameOrId('accounts').id
    const transactions = app.findCollectionByNameOrId('transactions')

    // 1. Add account_id relation (nullable)
    if (!transactions.fields.getByName('account_id')) {
      transactions.fields.add(
        new RelationField({
          name: 'account_id',
          type: 'relation',
          required: false,
          collectionId: accountsId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    // 2. Add transfer_to_account_id relation (nullable)
    if (!transactions.fields.getByName('transfer_to_account_id')) {
      transactions.fields.add(
        new RelationField({
          name: 'transfer_to_account_id',
          type: 'relation',
          required: false,
          collectionId: accountsId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    // 3. Update 'type' select field to include 'transfer'
    const typeField = transactions.fields.getByName('type')
    if (typeField) {
      typeField.values = ['expense', 'income', 'transfer']
      typeField.maxSelect = 1
    }

    transactions.addIndex('idx_transactions_account_id', false, 'account_id', '')
    transactions.addIndex(
      'idx_transactions_transfer_to_account_id',
      false,
      'transfer_to_account_id',
      '',
    )

    app.save(transactions)
  },
  (app) => {
    const transactions = app.findCollectionByNameOrId('transactions')
    try {
      transactions.removeIndex('idx_transactions_account_id')
    } catch (_) {}
    try {
      transactions.removeIndex('idx_transactions_transfer_to_account_id')
    } catch (_) {}
    try {
      transactions.fields.removeByName('account_id')
    } catch (_) {}
    try {
      transactions.fields.removeByName('transfer_to_account_id')
    } catch (_) {}
    const typeField = transactions.fields.getByName('type')
    if (typeField) {
      typeField.values = ['expense', 'income']
    }
    app.save(transactions)
  },
)
