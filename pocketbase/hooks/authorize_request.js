// Authorize UPDATE API requests on family-data collections based on the
// authenticated member's access_level and perm_* flags.
//
// Collections covered: transactions, invoices, debts, investments, budgets.
//
// Guardian  -> full access
// Co-admin  -> needs the relevant perm_* flag (perm_edit_others / perm_manage_debts)
// Member    -> only own records (owner_id.user_id = @request.auth.id)
// Guest     -> denied
//
// LIST/VIEW filtering is enforced by each collection's listRule/viewRule
// (owner_id.user_id = @request.auth.id || family_id.created_by = @request.auth.id).
// DELETE is enforced by check_delete_transactions.js.
//
// NOTE: all logic is inlined inside the callback — top-level helpers are NOT
// accessible inside JSVM hook callbacks (they run in a separate VM).

onRecordUpdateRequest(
  (e) => {
    if (e.hasSuperuserAuth()) {
      return e.next()
    }

    var auth = e.requestInfo().auth
    var authId = auth ? auth.id : ''
    var collectionName = e.collection ? e.collection.name : ''

    if (
      collectionName !== 'transactions' &&
      collectionName !== 'invoices' &&
      collectionName !== 'debts' &&
      collectionName !== 'investments' &&
      collectionName !== 'budgets'
    ) {
      return e.next()
    }

    if (!authId) {
      $app
        .logger()
        .info('AUTH: user=- level=- action=update collection=' + collectionName + ' denied=no_auth')
      return e.forbiddenError('Autenticacao necessaria')
    }

    var member = null
    try {
      member = $app.findFirstRecordByFilter('members', 'user_id = {:uid}', { uid: authId })
    } catch (_) {}

    if (!member) {
      $app
        .logger()
        .info(
          'AUTH: user=' +
            authId +
            ' level=- action=update collection=' +
            collectionName +
            ' denied=no_member',
        )
      return e.forbiddenError('Sem permissao para atualizar este recurso')
    }

    var accessLevel = member.getString('access_level') || 'member'

    if (accessLevel === 'guest') {
      $app
        .logger()
        .info(
          'AUTH: user=' +
            authId +
            ' level=guest action=update collection=' +
            collectionName +
            ' denied=guest',
        )
      return e.forbiddenError('Acesso de convidado negado')
    }

    if (accessLevel === 'guardian') {
      $app
        .logger()
        .info('AUTH: user=' + authId + ' level=guardian action=update collection=' + collectionName)
      return e.next()
    }

    // co_admin: needs the update perm flag for the collection
    if (accessLevel === 'co_admin') {
      var permFlag = null
      if (collectionName === 'transactions') permFlag = 'perm_edit_others'
      else if (collectionName === 'debts') permFlag = 'perm_manage_debts'

      if (permFlag && member.getBool(permFlag)) {
        $app
          .logger()
          .info(
            'AUTH: user=' +
              authId +
              ' level=co_admin action=update collection=' +
              collectionName +
              ' perm=' +
              permFlag,
          )
        return e.next()
      }

      // co_admin without the perm falls through to owner check
    }

    // budgets have no owner_id — non-guardian/co_admin cannot edit
    if (collectionName === 'budgets') {
      $app
        .logger()
        .info(
          'AUTH: user=' +
            authId +
            ' level=' +
            accessLevel +
            ' action=update collection=budgets denied=unauthorized',
        )
      return e.forbiddenError('Sem permissao para editar este orcamento')
    }

    // member / co_admin-without-perm: only own records
    try {
      var ownerId = e.record.getString('owner_id')
      if (ownerId) {
        var ownerMember = $app.findRecordById('members', ownerId)
        if (ownerMember.getString('user_id') === authId) {
          $app
            .logger()
            .info(
              'AUTH: user=' +
                authId +
                ' level=' +
                accessLevel +
                ' action=update collection=' +
                collectionName +
                ' owner=true',
            )
          return e.next()
        }
      }
    } catch (_) {}

    $app
      .logger()
      .info(
        'AUTH: user=' +
          authId +
          ' level=' +
          accessLevel +
          ' action=update collection=' +
          collectionName +
          ' denied=not_owner',
      )
    return e.forbiddenError('Sem permissao para editar este registro')
  },
  'transactions',
  'invoices',
  'debts',
  'investments',
  'budgets',
)
