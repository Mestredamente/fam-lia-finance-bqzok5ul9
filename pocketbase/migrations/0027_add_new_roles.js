migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('members')

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
        'self',
        'roommate',
        'cohabitant',
        'boyfriend',
        'girlfriend',
        'co_parent',
        'guardian',
        'dependent_adult',
        'household_member',
      ]
    }

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('members')

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

    app.save(col)
  },
)
