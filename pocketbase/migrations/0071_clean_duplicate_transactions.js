migrate(
  (app) => {
    function normalizeDescription(str) {
      if (!str || typeof str !== 'string') return ''
      return str
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/[^A-Z0-9\s]+$/g, '')
        .trim()
    }

    var transactions = []
    try {
      transactions = app.findRecordsByFilter(
        'transactions',
        'source = "invoice_import"',
        'created',
        10000,
        0,
      )
    } catch (err) {
      console.log('MIGRATION 0071: erro ao buscar transações invoice_import: ' + String(err))
      return
    }

    if (!transactions || transactions.length === 0) {
      console.log('MIGRATION 0071: nenhuma transação invoice_import encontrada.')
      return
    }

    // Agrupar por: normDesc + amount + txMonth (YYYY-MM) + familyId
    var groups = {}

    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i]
      var rawDesc = tx.getString('description') || ''
      var normDesc = normalizeDescription(rawDesc)
      var amount = tx.getFloat('amount') || 0
      var familyId = tx.getString('family_id') || ''
      var txDate = tx.getString('transaction_date') || ''
      var txMonth = ''
      if (txDate && txDate.length >= 7) {
        txMonth = txDate.substring(0, 7)
      }

      var key = familyId + '|' + txMonth + '|' + amount.toFixed(2) + '|' + normDesc

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(tx)
    }

    var totalGroupsProcessed = 0
    var totalDuplicatesDeleted = 0
    var totalFutureDeleted = 0

    for (var gKey in groups) {
      var list = groups[gKey]
      if (list.length <= 1) continue

      totalGroupsProcessed++

      // Ordenar: manter a primeira (menor created, fallback menor id)
      list.sort((a, b) => {
        var createdA = a.getString('created') || ''
        var createdB = b.getString('created') || ''
        if (createdA !== createdB) {
          return createdA < createdB ? -1 : 1
        }
        return a.id < b.id ? -1 : 1
      })

      var primary = list[0]
      var groupDesc = primary.getString('description') || ''
      var groupAmount = primary.getFloat('amount') || 0
      var groupDate = primary.getString('transaction_date') || ''
      var groupMonth = groupDate && groupDate.length >= 7 ? groupDate.substring(0, 7) : 'sem mês'

      var dupCount = 0
      var futureCount = 0

      for (var d = 1; d < list.length; d++) {
        var dupTx = list[d]
        var dupId = dupTx.id

        // 1. Buscar e DELETAR parcelas futuras filhas da duplicata
        if (dupId) {
          var futureTxs = []
          try {
            futureTxs = app.findRecordsByFilter(
              'transactions',
              'source = "future_installment" && parent_transaction_id = "' + dupId + '"',
              'created',
              500,
              0,
            )
          } catch (fErr) {
            console.log(
              'MIGRATION 0071: erro ao buscar future_installment para tx ' +
                dupId +
                ': ' +
                String(fErr),
            )
            futureTxs = []
          }

          for (var f = 0; f < futureTxs.length; f++) {
            var fTx = futureTxs[f]
            try {
              app.delete(fTx)
              futureCount++
              totalFutureDeleted++
            } catch (delFErr) {
              console.log(
                'MIGRATION 0071: erro ao deletar future_installment ' +
                  fTx.id +
                  ': ' +
                  String(delFErr),
              )
            }
          }
        }

        // 2. DELETAR a própria transação duplicata
        try {
          app.delete(dupTx)
          dupCount++
          totalDuplicatesDeleted++
        } catch (delErr) {
          console.log(
            'MIGRATION 0071: erro ao deletar transação duplicata ' + dupId + ': ' + String(delErr),
          )
        }
      }

      console.log(
        'Duplicata removida: ' +
          groupDesc +
          ' ' +
          groupAmount +
          ' ' +
          groupMonth +
          ' — ' +
          dupCount +
          ' transações + ' +
          futureCount +
          ' parcelas futuras deletadas',
      )
    }

    console.log(
      'MIGRATION 0071 concluída: ' +
        totalGroupsProcessed +
        ' grupos duplicados tratados. Total: ' +
        totalDuplicatesDeleted +
        ' transações e ' +
        totalFutureDeleted +
        ' parcelas futuras removidas.',
    )
  },
  (app) => {
    // Rollback não-destrutivo: remoção de registros duplicados não é revertida
  },
)
