migrate(
  (app) => {
    var families = []
    try {
      families = app.findRecordsByFilter('families', 'id != ""', 'created', 500, 0)
    } catch (e) {
      console.log('No families found:', e.message)
      return
    }

    var defaultCategories = [
      { name: 'Moradia', type: 'expense', icon: 'home', color: '#EF4444', is_fixed: true },
      { name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#F59E0B' },
      { name: 'Transporte', type: 'expense', icon: 'car', color: '#3B82F6' },
      { name: 'Saúde', type: 'expense', icon: 'heart', color: '#EC4899' },
      { name: 'Lazer', type: 'expense', icon: 'gamepad', color: '#8B5CF6' },
      { name: 'Educação', type: 'expense', icon: 'book', color: '#14B8A6' },
      { name: 'Cartão de Crédito', type: 'expense', icon: 'credit-card', color: '#6366F1' },
      {
        name: 'Assinaturas',
        type: 'expense',
        icon: 'refresh-cw',
        color: '#A855F7',
        is_fixed: true,
      },
      { name: 'Mercado', type: 'expense', icon: 'shopping-cart', color: '#F97316' },
      { name: 'Restaurantes', type: 'expense', icon: 'coffee', color: '#EAB308' },
      { name: 'Salário', type: 'income', icon: 'banknote', color: '#22C55E' },
      { name: 'Outros ganhos', type: 'income', icon: 'plus-circle', color: '#10B981' },
      { name: 'Parcelas', type: 'debt', icon: 'receipt', color: '#DC2626' },
    ]

    var defaultRules = [
      { keyword: 'mercado', categoryName: 'Mercado' },
      { keyword: 'supermercado', categoryName: 'Mercado' },
      { keyword: 'restaurante', categoryName: 'Restaurantes' },
      { keyword: 'ifood', categoryName: 'Restaurantes' },
      { keyword: 'uber', categoryName: 'Transporte' },
      { keyword: 'posto', categoryName: 'Transporte' },
      { keyword: 'combustivel', categoryName: 'Transporte' },
      { keyword: 'farmacia', categoryName: 'Saúde' },
      { keyword: 'hospital', categoryName: 'Saúde' },
      { keyword: 'aluguel', categoryName: 'Moradia' },
      { keyword: 'netflix', categoryName: 'Assinaturas' },
      { keyword: 'spotify', categoryName: 'Assinaturas' },
      { keyword: 'amazon', categoryName: 'Assinaturas' },
      { keyword: 'escola', categoryName: 'Educação' },
      { keyword: 'curso', categoryName: 'Educação' },
      { keyword: 'cinema', categoryName: 'Lazer' },
    ]

    var catCol = app.findCollectionByNameOrId('categories')
    var rulesCol = app.findCollectionByNameOrId('categorization_rules')

    for (var fi = 0; fi < families.length; fi++) {
      var familyId = families[fi].get('id')
      var catIdByName = {}

      var existingCats = []
      try {
        existingCats = app.findRecordsByFilter(
          'categories',
          'family_id = "' + familyId + '"',
          'created',
          200,
          0,
        )
      } catch (_) {}

      for (var ec = 0; ec < existingCats.length; ec++) {
        catIdByName[existingCats[ec].getString('name')] = existingCats[ec].get('id')
      }

      for (var dc = 0; dc < defaultCategories.length; dc++) {
        var dCat = defaultCategories[dc]
        if (!catIdByName[dCat.name]) {
          try {
            var newCat = new Record(catCol)
            newCat.set('family_id', familyId)
            newCat.set('name', dCat.name)
            newCat.set('type', dCat.type)
            newCat.set('icon', dCat.icon)
            newCat.set('color', dCat.color)
            newCat.set('is_fixed', dCat.is_fixed || false)
            newCat.set('is_custom', false)
            app.save(newCat)
            catIdByName[dCat.name] = newCat.get('id')
          } catch (e) {
            console.log('Failed to create category:', dCat.name, e.message)
          }
        }
      }

      for (var ri = 0; ri < defaultRules.length; ri++) {
        var rule = defaultRules[ri]
        var categoryId = catIdByName[rule.categoryName]
        if (!categoryId) continue

        var existingRules = []
        try {
          existingRules = app.findRecordsByFilter(
            'categorization_rules',
            'family_id = "' + familyId + '" && keyword = "' + rule.keyword + '"',
            'created',
            1,
            0,
          )
        } catch (_) {}

        if (existingRules.length === 0) {
          try {
            var newRule = new Record(rulesCol)
            newRule.set('family_id', familyId)
            newRule.set('keyword', rule.keyword)
            newRule.set('category_id', categoryId)
            newRule.set('match_type', 'contains')
            app.save(newRule)
          } catch (e) {
            console.log('Failed to create rule:', rule.keyword, e.message)
          }
        }
      }
    }

    console.log('Seed categorization rules migration completed')
  },
  (app) => {},
)
