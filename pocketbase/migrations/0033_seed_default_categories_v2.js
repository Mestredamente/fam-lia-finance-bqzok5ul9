migrate(
  (app) => {
    var userId = ''
    try {
      var user = app.findAuthRecordByEmail('_pb_users_auth_', 'mestredamente1@gmail.com')
      userId = user.get('id')
    } catch (e) {
      console.log('Default user not found:', e.message)
      return
    }

    var familyId = ''
    try {
      var families = app.findRecordsByFilter(
        'families',
        'created_by = "' + userId + '"',
        'created',
        1,
        0,
      )
      if (families.length > 0) {
        familyId = families[0].get('id')
      }
    } catch (e) {
      console.log('No family found:', e.message)
      return
    }

    if (!familyId) {
      console.log('No family found for default user')
      return
    }

    var defaultCategories = [
      { name: 'Alimentação', type: 'expense', icon: 'shopping-cart', color: '#10b981' },
      { name: 'Moradia', type: 'expense', icon: 'home', color: '#3b82f6' },
      { name: 'Transporte', type: 'expense', icon: 'car', color: '#f59e0b' },
      { name: 'Saúde', type: 'expense', icon: 'heart', color: '#ef4444' },
      { name: 'Educação', type: 'expense', icon: 'graduation-cap', color: '#8b5cf6' },
      { name: 'Lazer', type: 'expense', icon: 'gamepad-2', color: '#ec4899' },
      { name: 'Vestuário', type: 'expense', icon: 'shirt', color: '#14b8a6' },
      { name: 'Serviços', type: 'expense', icon: 'wrench', color: '#6b7280' },
      { name: 'Tecnologia', type: 'expense', icon: 'smartphone', color: '#6366f1' },
      { name: 'Salário', type: 'income', icon: 'trending-up', color: '#22c55e' },
      { name: 'Investimentos', type: 'investment', icon: 'piggy-bank', color: '#f97316' },
      { name: 'Outros', type: 'expense', icon: 'package', color: '#9ca3af' },
    ]

    var catCol = app.findCollectionByNameOrId('categories')

    for (var i = 0; i < defaultCategories.length; i++) {
      var dc = defaultCategories[i]

      var existing = []
      try {
        existing = app.findRecordsByFilter(
          'categories',
          'family_id = "' + familyId + '" && name = "' + dc.name + '"',
          'created',
          1,
          0,
        )
      } catch (_) {}

      if (existing.length === 0) {
        try {
          var record = new Record(catCol)
          record.set('family_id', familyId)
          record.set('name', dc.name)
          record.set('type', dc.type)
          record.set('icon', dc.icon)
          record.set('color', dc.color)
          record.set('is_fixed', false)
          record.set('is_custom', false)
          record.set('created_by', userId)
          app.save(record)
        } catch (e) {
          console.log('Failed to create category:', dc.name, e.message)
        }
      }
    }

    console.log('Default categories v2 seed migration completed')
  },
  (app) => {},
)
