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

    if (!familyId) return

    var catIdByName = {}
    try {
      var cats = app.findRecordsByFilter(
        'categories',
        'family_id = "' + familyId + '"',
        'created',
        500,
        0,
      )
      for (var i = 0; i < cats.length; i++) {
        catIdByName[cats[i].getString('name')] = cats[i].get('id')
      }
    } catch (e) {
      console.log('Failed to load categories:', e.message)
      return
    }

    var defaultRules = [
      { keyword: 'MERCADO', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'SUPERMERCADO', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'PÃO DE AÇÚCAR', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'CARREFOUR', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'ASSAÍ', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'ATACADÃO', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'IFOOD', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'RAPPI', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'RESTAURANTE', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'LANCHONETE', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'PADARIA', categoryName: 'Alimentação', matchType: 'contains' },
      { keyword: 'POSTO', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'SHELL', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'IPIRANGA', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'PETROBRAS', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'BR PETRO', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'UBER', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: '99', categoryName: 'Transporte', matchType: 'starts_with' },
      { keyword: 'ESTACIONAMENTO', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'PEDÁGIO', categoryName: 'Transporte', matchType: 'contains' },
      { keyword: 'FARMÁCIA', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'DROGASIL', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'RAIA', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'PACHECO', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'SÃO RAFAEL', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'DROGARIA', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'HOSPITAL', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'CLÍNICA', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'CONSULTÓRIO', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'LABORATÓRIO', categoryName: 'Saúde', matchType: 'contains' },
      { keyword: 'NET', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'CLARO', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'VIVO', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'TIM', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'APPLE', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'GOOGLE', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'AMAZON', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'MERCADO LIVRE', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'SHOPEE', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'ALIEXPRESS', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'SPOTIFY', categoryName: 'Tecnologia', matchType: 'contains' },
      { keyword: 'NETFLIX', categoryName: 'Tecnologia', matchType: 'contains' },
    ]

    var rulesCol = app.findCollectionByNameOrId('categorization_rules')

    for (var r = 0; r < defaultRules.length; r++) {
      var rule = defaultRules[r]
      var categoryId = catIdByName[rule.categoryName]
      if (!categoryId) continue

      var existing = []
      try {
        existing = app.findRecordsByFilter(
          'categorization_rules',
          'family_id = "' + familyId + '" && keyword = "' + rule.keyword + '"',
          'created',
          1,
          0,
        )
      } catch (_) {}

      if (existing.length === 0) {
        try {
          var record = new Record(rulesCol)
          record.set('family_id', familyId)
          record.set('keyword', rule.keyword)
          record.set('category_id', categoryId)
          record.set('match_type', rule.matchType)
          record.set('created_by', userId)
          app.save(record)
        } catch (e) {
          console.log('Failed to create rule:', rule.keyword, e.message)
        }
      }
    }

    console.log('Default categorization rules v2 seed migration completed')
  },
  (app) => {},
)
