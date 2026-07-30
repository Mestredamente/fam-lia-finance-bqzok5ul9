migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('members')

    if (!col.fields.getByName('birth_date')) {
      col.fields.add(new DateField({ name: 'birth_date' }))
    }
    if (!col.fields.getByName('is_dependent')) {
      col.fields.add(new BoolField({ name: 'is_dependent' }))
    }
    if (!col.fields.getByName('monthly_allowance')) {
      col.fields.add(new NumberField({ name: 'monthly_allowance' }))
    }
    if (!col.fields.getByName('monthly_income_real')) {
      col.fields.add(new NumberField({ name: 'monthly_income_real' }))
    }
    if (!col.fields.getByName('occupation')) {
      col.fields.add(new TextField({ name: 'occupation' }))
    }
    if (!col.fields.getByName('avatar_url')) {
      col.fields.add(new TextField({ name: 'avatar_url' }))
    }
    if (!col.fields.getByName('is_active')) {
      col.fields.add(new BoolField({ name: 'is_active' }))
    }

    var userIdField = col.fields.getByName('user_id')
    if (userIdField) {
      userIdField.required = false
    }

    var emailField = col.fields.getByName('email')
    if (emailField) {
      emailField.required = false
    }

    var roleField = col.fields.getByName('role')
    if (roleField) {
      roleField.values = [
        'husband',
        'wife',
        'partner',
        'son',
        'daughter',
        'stepson',
        'stepdaughter',
        'father',
        'mother',
        'father_in_law',
        'mother_in_law',
        'grandfather',
        'grandmother',
        'brother',
        'sister',
        'uncle',
        'aunt',
        'nephew',
        'niece',
        'cousin',
        'other',
        'child',
      ]
    }

    col.createRule = 'family_id.created_by = @request.auth.id || user_id = @request.auth.id'
    col.updateRule = 'user_id = @request.auth.id || family_id.created_by = @request.auth.id'

    app.save(col)

    app
      .db()
      .newQuery('UPDATE members SET is_active = 1 WHERE is_active IS NULL OR is_active = 0')
      .execute()
  },
  (app) => {
    var col = app.findCollectionByNameOrId('members')

    col.createRule = 'user_id = @request.auth.id'
    col.updateRule = 'user_id = @request.auth.id'

    var userIdField = col.fields.getByName('user_id')
    if (userIdField) {
      userIdField.required = true
    }

    var emailField = col.fields.getByName('email')
    if (emailField) {
      emailField.required = true
    }

    var roleField = col.fields.getByName('role')
    if (roleField) {
      roleField.values = ['husband', 'wife', 'partner', 'child']
    }

    app.save(col)
  },
)
