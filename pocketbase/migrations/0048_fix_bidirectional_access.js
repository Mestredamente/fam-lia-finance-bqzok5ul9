migrate(
  (app) => {
    // helper to load a collection by name
    function load(name) {
      return app.findCollectionByNameOrId(name)
    }

    // Membership test: the authed user is a member of the record's family.
    // @collection.members lets us join the members collection from any rule;
    // ?= means "any/at-least-one-of" the joined member records must satisfy the
    // condition. We match a member row whose user_id is the authed user AND
    // whose family_id is the record's family_id — that proves membership.
    // Membership test: the authed user is a member of the record's family.
    // @collection.members lets us join the members collection from any rule;
    // ?= means "any/at-least-one-of" the joined member records must satisfy the
    // condition. We match a member row whose user_id is the authed user AND
    // whose family_id is the record's family id.
    //
    // `familyIdField` is the field on THIS collection that holds the family id
    // — for most collections that is `family_id`, but for the families
    // collection itself the record id IS the family id, so it is `id`.
    function memberOfFamily(familyIdField) {
      return (
        '@collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= ' +
        familyIdField
      )
    }

    // Same as above but additionally requires a specific permission flag on the
    // matching member row (e.g. perm_view_patrimony, perm_edit_others, ...).
    function memberOfFamilyWithPerm(familyIdField, permField) {
      return (
        '@collection.members.user_id ?= @request.auth.id && @collection.members.family_id ?= ' +
        familyIdField +
        ' && @collection.members.' +
        permField +
        ' = true'
      )
    }

    // 1. families — list rule: a user can list families they created OR
    //    families where they are a member. The record id is the family id.
    var families = load('families')
    families.listRule = 'created_by = @request.auth.id || (' + memberOfFamily('id') + ')'
    app.save(families)

    // 2 & 3. members — list/view: own record or member of the same family;
    //    update/delete: own record OR family creator OR co-admin/guardian with
    //    perm_manage_members in that family.
    var members = load('members')
    members.listRule = 'user_id = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    members.viewRule = 'user_id = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    members.updateRule =
      'user_id = @request.auth.id || family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    members.deleteRule =
      'user_id = @request.auth.id || family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    app.save(members)

    // 4, 5 & 6. transactions — list/view: own OR shared in a family the user
    //    belongs to OR family creator; update: own OR family creator OR
    //    co-admin with perm_edit_others; delete: own OR family creator OR
    //    co-admin with perm_delete_transactions.
    var transactions = load('transactions')
    transactions.listRule =
      'owner_id.user_id = @request.auth.id || (is_shared = true && (' +
      memberOfFamily('family_id') +
      ')) || family_id.created_by = @request.auth.id'
    transactions.viewRule =
      'owner_id.user_id = @request.auth.id || (is_shared = true && (' +
      memberOfFamily('family_id') +
      ')) || family_id.created_by = @request.auth.id'
    transactions.updateRule =
      'owner_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_edit_others') +
      ')'
    transactions.deleteRule =
      'owner_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_delete_transactions') +
      ')'
    app.save(transactions)

    // 7. credit_cards — list/view: own OR member of the same family.
    var creditCards = load('credit_cards')
    creditCards.listRule =
      'owner_id.user_id = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    creditCards.viewRule =
      'owner_id.user_id = @request.auth.id || (' + memberOfFamily('family_id') + ')'
    app.save(creditCards)

    // 8. investments — list/view: own OR member of the same family with
    //    perm_view_patrimony.
    var investments = load('investments')
    investments.listRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_patrimony') +
      ')'
    investments.viewRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_patrimony') +
      ')'
    app.save(investments)

    // 9. debts — list/view: own OR member of the same family with
    //    perm_view_patrimony.
    var debts = load('debts')
    debts.listRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_patrimony') +
      ')'
    debts.viewRule =
      'owner_id.user_id = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_view_patrimony') +
      ')'
    app.save(debts)

    // 10. household_tasks — list/view: add membership to the existing
    //     creator/assignee/owner conditions.
    var householdTasks = load('household_tasks')
    householdTasks.listRule =
      'family_id.created_by = @request.auth.id || assigned_to.user_id = @request.auth.id || created_by.user_id = @request.auth.id || (' +
      memberOfFamily('family_id') +
      ')'
    householdTasks.viewRule =
      'family_id.created_by = @request.auth.id || assigned_to.user_id = @request.auth.id || created_by.user_id = @request.auth.id || (' +
      memberOfFamily('family_id') +
      ')'
    app.save(householdTasks)

    // 11. categories — create/update/delete: family creator OR co-admin with
    //     perm_manage_members in that family. list/view stay auth-only.
    var categories = load('categories')
    categories.createRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    categories.updateRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    categories.deleteRule =
      'family_id.created_by = @request.auth.id || (' +
      memberOfFamilyWithPerm('family_id', 'perm_manage_members') +
      ')'
    app.save(categories)
  },
  (app) => {
    // no-op: restoring the previous tightened rules would re-widen access
    // in unintended ways, so we intentionally leave the bidirectional rules.
  },
)
