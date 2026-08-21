import pb from '@/lib/pocketbase/client'
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/accounts'
import type { TransactionRecord } from '@/types/finance'
import { fixMojibake } from '@/lib/utils'

export const getAccounts = async (familyId: string, activeOnly = true): Promise<Account[]> => {
  if (!familyId) return []
  const filter = activeOnly
    ? `family_id = "${familyId}" && is_active = true`
    : `family_id = "${familyId}"`
  const records = await pb.collection('accounts').getFullList<Account>({
    filter,
    sort: '-created',
  })
  return records
}

export const getAllAccountsByFamily = async (familyId: string): Promise<Account[]> => {
  if (!familyId) return []
  const records = await pb.collection('accounts').getFullList<Account>({
    filter: `family_id = "${familyId}"`,
    sort: '-created',
  })
  return records
}

export const getAccountById = async (id: string): Promise<Account> => {
  return pb.collection('accounts').getOne<Account>(id)
}

export const createAccount = async (data: CreateAccountInput): Promise<Account> => {
  return pb.collection('accounts').create<Account>({
    ...data,
    is_active: data.is_active !== undefined ? data.is_active : true,
  })
}

export const updateAccount = async (id: string, data: UpdateAccountInput): Promise<Account> => {
  return pb.collection('accounts').update<Account>(id, data)
}

export const deleteAccount = async (id: string): Promise<boolean> => {
  return pb.collection('accounts').delete(id)
}

export const getAccountTransactions = async (accountId: string): Promise<TransactionRecord[]> => {
  if (!accountId) return []
  const records = await pb.collection('transactions').getFullList<TransactionRecord>({
    filter: `account_id = "${accountId}" || transfer_to_account_id = "${accountId}"`,
    sort: '-transaction_date',
    expand: 'category_id,owner_id',
  })
  return records.map((tx) => ({
    ...tx,
    description: fixMojibake(tx.description),
  }))
}
