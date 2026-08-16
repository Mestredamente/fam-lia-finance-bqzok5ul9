// Creates the `recurring_transactions` collection: fixed monthly/weekly/yearly
// bills/income (rent, streaming, salary, condo, ...) that replicate automatically
// via the generate_recurring_transactions cron hook. This is SEPARATE from debts
// (which handle installment-based financing/loans with source='recurring_debt').
// Transactions generated from these records use source='recurring' and recurring_id.
migrate(
  (app) => {
    var familiesId = app.findCollectionByNameOrId('families').id
    var membersId = app.findCollectionByNameOrId('members').id
    var categoriesId = app.findCollectionByNameOrId('categories').id
    var creditCardsId = app.findCollectionByNameOrId('credit_cards').id

    var collection = new Collection({
      name: 'recurring_transactions',
      type: 'base',
      listRule:
        'member_id.user_id = @request.auth.id || (shared = true && @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id) || family_id.created_by = @request.auth.id',
      viewRule:
        'member_id.user_id = @request.auth.id || (shared = true && @collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= family_id) || family_id.created_by = @request.auth.id',
      createRule: 'family_id.created_by = @request.auth.id || member_id.user_id = @request.auth.id',
      updateRule: 'family_id.created_by = @request.auth.id || member_id.user_id = @request.auth.id',
      deleteRule: 'family_id.created_by = @request.auth.id || member_id.user_id = @request.auth.id',
      fields: [
        {
          name: 'family_id',
          type: 'relation',
          required: true,
          collectionId: familiesId,
          maxSelect: 1,
        },
        {
          name: 'member_id',
          type: 'relation',
          required: true,
          collectionId: membersId,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['receita', 'despesa'],
          maxSelect: 1,
        },
        { name: 'category_id', type: 'relation', collectionId: categoriesId, maxSelect: 1 },
        {
          name: 'emotion',
          type: 'select',
          values: ['feliz', 'necessario', 'neutro', 'arrependido', 'impulsivo', 'ansioso'],
          maxSelect: 1,
        },
        {
          name: 'frequency',
          type: 'select',
          required: true,
          values: ['monthly', 'weekly', 'yearly'],
          maxSelect: 1,
        },
        { name: 'day_of_month', type: 'number', required: true, min: 1, max: 31 },
        { name: 'card_id', type: 'relation', collectionId: creditCardsId, maxSelect: 1 },
        { name: 'shared', type: 'bool' },
        { name: 'active', type: 'bool' },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_recurring_transactions_family_id ON recurring_transactions (family_id)',
        'CREATE INDEX idx_recurring_transactions_member_id ON recurring_transactions (member_id)',
        'CREATE INDEX idx_recurring_transactions_active ON recurring_transactions (active)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    var collection = app.findCollectionByNameOrId('recurring_transactions')
    app.delete(collection)
  },
)
