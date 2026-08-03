onRecordUpdate((e) => {
  var newStatus = e.record.getString('status')
  var oldStatus = e.record.original().getString('status')

  if (newStatus === 'reviewed' && oldStatus !== 'reviewed') {
    var now = new Date()
    e.record.set('reviewed_at', now.toISOString())
  }

  if (newStatus === 'paid' && oldStatus !== 'paid') {
    if (!e.record.getString('reviewed_at')) {
      var paidNow = new Date()
      e.record.set('reviewed_at', paidNow.toISOString())
    }
  }

  e.next()
}, 'invoices')
