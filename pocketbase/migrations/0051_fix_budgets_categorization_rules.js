migrate(
  (app) => {
    // Same membership pattern as migrations 0048/0050: a member of the
    // record's family is granted read access; writes additionally require a
    // specific permission flag on the matching member row.
    //
    // Before this migration both `budgets` and `categorization_rules` used the
    // overly-permissive `@request.auth.id != ''` rule, which let any
    // authenticated user read/write records from ANY family. This narrows
    // access to the family scope (family creator or a member of that family).
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

    // budgets — list/view: family creator OR member of the same family.
    // create/update/delete: family creator OR co-admin/guardian member with
    // perm_edit_others in that family.
    var budgets = app.findCollectionByNameOrId('budgets')
    budgets.listRule =
      'family_id.created_by = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    budgets.viewRule =
      'family_id.created_by = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    budgets.createRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_edit_others') +
      ')'
    budgets.updateRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_edit_others') +
      ')'
    budgets.deleteRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_edit_others') +
      ')'
    app.save(budgets)

    // categorization_rules — list/view: family creator OR member of the same
    // family. create: requires perm_edit_others. update/delete: requires
    // perm_manage_members (stricter, since rules drive automatic
    // categorization for the whole family).
    var categorizationRules = app.findCollectionByNameOrId('categorization_rules')
    categorizationRules.listRule =
      'family_id.created_by = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    categorizationRules.viewRule =
      'family_id.created_by = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    categorizationRules.createRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_edit_others') +
      ')'
    categorizationRules.updateRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    categorizationRules.deleteRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    app.save(categorizationRules)
  },
  (app) => {
    // no-op: restoring the previous rules would re-widen access in unintended
    // ways, so we intentionally leave the family-scoped rules.
  },
)
