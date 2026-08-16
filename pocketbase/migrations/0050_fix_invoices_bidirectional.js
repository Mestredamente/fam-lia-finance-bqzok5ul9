migrate(
  (app) => {
    // Same membership pattern as migration 0048: a member of the record's
    // family is granted read access; writes additionally require a specific
    // permission flag on the matching member row.
    //
    // `familyIdField` is the field on THIS collection that holds the family id.
    function memberOfFamily(familyIdField) {
      return (
        '@collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= ' +
        familyIdField
      )
    }

    function memberOfFamilyWithPerm(familyIdField, permField) {
      return (
        '@collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= ' +
        familyIdField +
        ' && @collection.members.' +
        permField +
        ' ?= true'
      )
    }

    // invoices — list/view: family creator OR owner OR member of the same
    // family. create/update/delete stay as-is (creator/owner only).
    var invoices = app.findCollectionByNameOrId('invoices')
    invoices.listRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id || (' +
      memberOfFamily('family_id') +
      ')'
    invoices.viewRule =
      'family_id.created_by = @request.auth.id || owner_id.user_id = @request.auth.id || (' +
      memberOfFamily('family_id') +
      ')'
    app.save(invoices)

    // invoice_items — list/view: family creator OR member of the same family.
    // create: kept as-is. update/delete: family creator OR invoice owner OR
    // co-admin member with the relevant permission flag.
    var invoiceItems = app.findCollectionByNameOrId('invoice_items')
    invoiceItems.listRule =
      'family_id.created_by = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    invoiceItems.viewRule =
      'family_id.created_by = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    invoiceItems.updateRule =
      'family_id.created_by = @request.auth.id || invoice_id.owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_edit_others') +
      ')'
    invoiceItems.deleteRule =
      'family_id.created_by = @request.auth.id || invoice_id.owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_delete_invoices') +
      ')'
    app.save(invoiceItems)
  },
  (app) => {
    // no-op: restoring the previous rules would re-widen access in unintended
    // ways, so we intentionally leave the bidirectional rules.
  },
)
