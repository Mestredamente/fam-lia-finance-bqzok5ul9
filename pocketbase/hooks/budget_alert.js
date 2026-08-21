onRecordAfterCreateSuccess((e) => {
  try {
    var tx = e.record
    var type = tx.getString('type')
    if (type !== 'expense') return e.next()

    var familyId = tx.getString('family_id')
    var categoryId = tx.getString('category_id')
    var tDateStr = tx.getString('transaction_date')

    if (!familyId || !categoryId || !tDateStr) return e.next()

    // 1. Respeitar auto_budget_alert da família
    try {
      var fam = $app.findRecordById('families', familyId)
      if (fam.get('auto_budget_alert') === false) return e.next()
    } catch (_) {
      return e.next()
    }

    // 2. Buscar orçamento da categoria
    var budgets = []
    try {
      budgets = $app.findRecordsByFilter(
        'budgets',
        'category_id = "' + categoryId + '" && family_id = "' + familyId + '" && is_active = true',
        'created',
        1,
        0,
      )
    } catch (_) {
      budgets = []
    }

    if (budgets.length === 0) return e.next()
    var budget = budgets[0]
    var monthlyLimit = budget.get('monthly_limit') || 0
    if (monthlyLimit <= 0) return e.next()

    // 3. Mês da transaction_date
    var d = new Date(tDateStr.split(' ')[0].split('T')[0] + 'T00:00:00')
    var y = d.getFullYear()
    var m = d.getMonth() + 1
    var mStr = m < 10 ? '0' + m : '' + m
    var firstDay = y + '-' + mStr + '-01'

    var nextMDate = new Date(y, d.getMonth() + 1, 1)
    var nextY = nextMDate.getFullYear()
    var nextM = nextMDate.getMonth() + 1
    var nextMStr = nextM < 10 ? '0' + nextM : '' + nextM
    var lastDayLimit = nextY + '-' + nextMStr + '-01'

    // 4. Calcular total gasto na categoria no mês corrente
    var monthTxs = []
    try {
      monthTxs = $app.findRecordsByFilter(
        'transactions',
        'family_id = "' +
          familyId +
          '" && category_id = "' +
          categoryId +
          '" && type = "expense" && transaction_date >= "' +
          firstDay +
          '" && transaction_date < "' +
          lastDayLimit +
          '"',
        'created',
        500,
        0,
      )
    } catch (_) {
      monthTxs = []
    }

    var totalSpent = 0
    for (var i = 0; i < monthTxs.length; i++) {
      totalSpent += monthTxs[i].get('amount') || 0
    }

    var pct = (totalSpent / monthlyLimit) * 100
    if (pct < 80) return e.next()

    // 5. Buscar nome da categoria
    var categoryName = 'Categoria'
    try {
      var catRec = $app.findRecordById('categories', categoryId)
      categoryName = catRec.getString('name') || 'Categoria'
    } catch (_) {}

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var roundedPct = Math.round(pct)
    var remaining = Math.max(0, monthlyLimit - totalSpent)

    var notifType = pct >= 100 ? 'budget_exceeded' : 'budget_warning'
    var notifTitle = ''
    var notifMessage = ''

    if (pct >= 100) {
      notifTitle = 'Orçamento de ' + categoryName + ' estourou!'
      notifMessage =
        'Você ultrapassou 100% do orçamento de ' +
        categoryName +
        '. Gasto: R$ ' +
        totalSpent.toFixed(2) +
        ' / Orçado: R$ ' +
        monthlyLimit.toFixed(2) +
        '.'
    } else {
      notifTitle = 'Orçamento de ' + categoryName + ' em ' + roundedPct + '%'
      notifMessage =
        'Você já usou ' +
        roundedPct +
        '% do orçamento de ' +
        categoryName +
        '. Restam R$ ' +
        remaining.toFixed(2) +
        ' para esta categoria este mês.'
    }

    // 6. Verificar se já existe notificação para esta categoria e mês
    var existingNotifs = []
    try {
      existingNotifs = $app.findRecordsByFilter(
        'notifications',
        'family_id = "' +
          familyId +
          '" && (type = "budget_warning" || type = "budget_exceeded") && created >= "' +
          firstDay +
          ' 00:00:00"',
        '-created',
        50,
        0,
      )
    } catch (_) {
      existingNotifs = []
    }

    var existingForCat = null
    for (var j = 0; j < existingNotifs.length; j++) {
      var notif = existingNotifs[j]
      var meta = notif.get('metadata')
      if (meta && (meta.category_id === categoryId || meta.categoryId === categoryId)) {
        existingForCat = notif
        break
      }
    }

    if (existingForCat) {
      existingForCat.set('type', notifType)
      existingForCat.set('title', notifTitle)
      existingForCat.set('message', notifMessage)
      existingForCat.set('is_read', false)
      existingForCat.set('metadata', {
        category_id: categoryId,
        percent: roundedPct,
        month: y + '-' + mStr,
        spent: totalSpent,
        budget: monthlyLimit,
      })
      $app.save(existingForCat)
      $app
        .logger()
        .info(
          'BUDGET_ALERT: Notificação atualizada',
          'cat',
          categoryName,
          'pct',
          String(roundedPct),
        )
    } else {
      var newNotif = new Record(notifCol)
      newNotif.set('family_id', familyId)
      newNotif.set('type', notifType)
      newNotif.set('title', notifTitle)
      newNotif.set('message', notifMessage)
      newNotif.set('is_read', false)
      newNotif.set('metadata', {
        category_id: categoryId,
        percent: roundedPct,
        month: y + '-' + mStr,
        spent: totalSpent,
        budget: monthlyLimit,
      })
      $app.save(newNotif)
      $app
        .logger()
        .info('BUDGET_ALERT: Notificação criada', 'cat', categoryName, 'pct', String(roundedPct))
    }
  } catch (err) {
    $app.logger().error('BUDGET_ALERT (create): Erro ao processar alerta', 'error', String(err))
  }

  return e.next()
}, 'transactions')

onRecordAfterUpdateSuccess((e) => {
  try {
    var tx = e.record
    var type = tx.getString('type')
    if (type !== 'expense') return e.next()

    var familyId = tx.getString('family_id')
    var categoryId = tx.getString('category_id')
    var tDateStr = tx.getString('transaction_date')

    if (!familyId || !categoryId || !tDateStr) return e.next()

    // Respeitar auto_budget_alert da família
    try {
      var fam = $app.findRecordById('families', familyId)
      if (fam.get('auto_budget_alert') === false) return e.next()
    } catch (_) {
      return e.next()
    }

    var budgets = []
    try {
      budgets = $app.findRecordsByFilter(
        'budgets',
        'category_id = "' + categoryId + '" && family_id = "' + familyId + '" && is_active = true',
        'created',
        1,
        0,
      )
    } catch (_) {
      budgets = []
    }

    if (budgets.length === 0) return e.next()
    var budget = budgets[0]
    var monthlyLimit = budget.get('monthly_limit') || 0
    if (monthlyLimit <= 0) return e.next()

    var d = new Date(tDateStr.split(' ')[0].split('T')[0] + 'T00:00:00')
    var y = d.getFullYear()
    var m = d.getMonth() + 1
    var mStr = m < 10 ? '0' + m : '' + m
    var firstDay = y + '-' + mStr + '-01'

    var nextMDate = new Date(y, d.getMonth() + 1, 1)
    var nextY = nextMDate.getFullYear()
    var nextM = nextMDate.getMonth() + 1
    var nextMStr = nextM < 10 ? '0' + nextM : '' + nextM
    var lastDayLimit = nextY + '-' + nextMStr + '-01'

    var monthTxs = []
    try {
      monthTxs = $app.findRecordsByFilter(
        'transactions',
        'family_id = "' +
          familyId +
          '" && category_id = "' +
          categoryId +
          '" && type = "expense" && transaction_date >= "' +
          firstDay +
          '" && transaction_date < "' +
          lastDayLimit +
          '"',
        'created',
        500,
        0,
      )
    } catch (_) {
      monthTxs = []
    }

    var totalSpent = 0
    for (var i = 0; i < monthTxs.length; i++) {
      totalSpent += monthTxs[i].get('amount') || 0
    }

    var pct = (totalSpent / monthlyLimit) * 100
    if (pct < 80) return e.next()

    var categoryName = 'Categoria'
    try {
      var catRec = $app.findRecordById('categories', categoryId)
      categoryName = catRec.getString('name') || 'Categoria'
    } catch (_) {}

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var roundedPct = Math.round(pct)
    var remaining = Math.max(0, monthlyLimit - totalSpent)

    var notifType = pct >= 100 ? 'budget_exceeded' : 'budget_warning'
    var notifTitle = ''
    var notifMessage = ''

    if (pct >= 100) {
      notifTitle = 'Orçamento de ' + categoryName + ' estourou!'
      notifMessage =
        'Você ultrapassou 100% do orçamento de ' +
        categoryName +
        '. Gasto: R$ ' +
        totalSpent.toFixed(2) +
        ' / Orçado: R$ ' +
        monthlyLimit.toFixed(2) +
        '.'
    } else {
      notifTitle = 'Orçamento de ' + categoryName + ' em ' + roundedPct + '%'
      notifMessage =
        'Você já usou ' +
        roundedPct +
        '% do orçamento de ' +
        categoryName +
        '. Restam R$ ' +
        remaining.toFixed(2) +
        ' para esta categoria este mês.'
    }

    var existingNotifs = []
    try {
      existingNotifs = $app.findRecordsByFilter(
        'notifications',
        'family_id = "' +
          familyId +
          '" && (type = "budget_warning" || type = "budget_exceeded") && created >= "' +
          firstDay +
          ' 00:00:00"',
        '-created',
        50,
        0,
      )
    } catch (_) {
      existingNotifs = []
    }

    var existingForCat = null
    for (var j = 0; j < existingNotifs.length; j++) {
      var notif = existingNotifs[j]
      var meta = notif.get('metadata')
      if (meta && (meta.category_id === categoryId || meta.categoryId === categoryId)) {
        existingForCat = notif
        break
      }
    }

    if (existingForCat) {
      existingForCat.set('type', notifType)
      existingForCat.set('title', notifTitle)
      existingForCat.set('message', notifMessage)
      existingForCat.set('is_read', false)
      existingForCat.set('metadata', {
        category_id: categoryId,
        percent: roundedPct,
        month: y + '-' + mStr,
        spent: totalSpent,
        budget: monthlyLimit,
      })
      $app.save(existingForCat)
      $app
        .logger()
        .info(
          'BUDGET_ALERT (update): Notificação atualizada',
          'cat',
          categoryName,
          'pct',
          String(roundedPct),
        )
    } else {
      var newNotif = new Record(notifCol)
      newNotif.set('family_id', familyId)
      newNotif.set('type', notifType)
      newNotif.set('title', notifTitle)
      newNotif.set('message', notifMessage)
      newNotif.set('is_read', false)
      newNotif.set('metadata', {
        category_id: categoryId,
        percent: roundedPct,
        month: y + '-' + mStr,
        spent: totalSpent,
        budget: monthlyLimit,
      })
      $app.save(newNotif)
      $app
        .logger()
        .info(
          'BUDGET_ALERT (update): Notificação criada',
          'cat',
          categoryName,
          'pct',
          String(roundedPct),
        )
    }
  } catch (err) {
    $app.logger().error('BUDGET_ALERT (update): Erro ao processar alerta', 'error', String(err))
  }

  return e.next()
}, 'transactions')
