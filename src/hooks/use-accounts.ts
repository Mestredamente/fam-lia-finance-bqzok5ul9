import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAllAccountsByFamily,
  createAccount as createAccountService,
  updateAccount as updateAccountService,
  deleteAccount as deleteAccountService,
} from '@/services/accounts'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/accounts'
import type { TransactionRecord } from '@/types/finance'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'

export function useAccounts(familyId?: string) {
  const [rawAccounts, setRawAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!familyId) {
      setRawAccounts([])
      setTransactions([])
      setIsLoading(false)
      return
    }
    try {
      setError(null)
      const [accs, txs] = await Promise.all([
        getAllAccountsByFamily(familyId),
        pb.collection('transactions').getFullList<TransactionRecord>({
          filter: `family_id = "${familyId}" && (account_id != "" || transfer_to_account_id != "")`,
          fields: 'id,amount,type,account_id,transfer_to_account_id',
        }),
      ])
      setRawAccounts(accs)
      setTransactions(txs)
    } catch (err) {
      setError(getPortugueseError(err))
    } finally {
      setIsLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('accounts', () => {
    loadData()
  })

  useRealtime('transactions', () => {
    loadData()
  })

  // Calculate current_balance for each account:
  // initial_balance
  // + SUM(income com account_id)
  // - SUM(expense com account_id)
  // + SUM(transfer com transfer_to_account_id)
  // - SUM(transfer com account_id)
  const accounts = useMemo(() => {
    return rawAccounts.map((acc) => {
      const initial = Number(acc.initial_balance || 0)
      let balance = initial

      for (const tx of transactions) {
        const amt = Number(tx.amount || 0)
        if (tx.type === 'income' && tx.account_id === acc.id) {
          balance += amt
        } else if (tx.type === 'expense' && tx.account_id === acc.id) {
          balance -= amt
        } else if (tx.type === 'transfer') {
          if (tx.transfer_to_account_id === acc.id) {
            balance += amt
          }
          if (tx.account_id === acc.id) {
            balance -= amt
          }
        }
      }

      return {
        ...acc,
        current_balance: balance,
      }
    })
  }, [rawAccounts, transactions])

  const totalBalance = useMemo(() => {
    return accounts
      .filter((a) => a.is_active !== false)
      .reduce((sum, a) => sum + (a.current_balance || 0), 0)
  }, [accounts])

  const createAccount = async (input: Omit<CreateAccountInput, 'family_id'>) => {
    if (!familyId) throw new Error('Família não encontrada')
    const tempId = 'temp-' + Date.now()
    const optimisticAccount: Account = {
      id: tempId,
      family_id: familyId,
      name: input.name,
      type: input.type,
      bank: input.bank,
      initial_balance: input.initial_balance,
      color: input.color,
      icon: input.icon,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      current_balance: Number(input.initial_balance || 0),
    }

    setRawAccounts((prev) => [optimisticAccount, ...prev])

    try {
      const created = await createAccountService({
        ...input,
        family_id: familyId,
      })
      setRawAccounts((prev) => prev.map((a) => (a.id === tempId ? created : a)))
      toast({ title: 'Conta criada com sucesso!' })
      return created
    } catch (err) {
      setRawAccounts((prev) => prev.filter((a) => a.id !== tempId))
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: getPortugueseError(err),
      })
      throw err
    }
  }

  const updateAccount = async (id: string, input: UpdateAccountInput) => {
    const previous = rawAccounts.find((a) => a.id === id)
    if (previous) {
      setRawAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...input, updated: new Date().toISOString() } : a)),
      )
    }

    try {
      const updated = await updateAccountService(id, input)
      setRawAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)))
      toast({ title: 'Conta atualizada!' })
      return updated
    } catch (err) {
      if (previous) {
        setRawAccounts((prev) => prev.map((a) => (a.id === id ? previous : a)))
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar conta',
        description: getPortugueseError(err),
      })
      throw err
    }
  }

  const deleteAccount = async (id: string) => {
    const previous = rawAccounts.find((a) => a.id === id)
    setRawAccounts((prev) => prev.filter((a) => a.id !== id))

    try {
      await deleteAccountService(id)
      toast({ title: 'Conta excluída com sucesso!' })
    } catch (err) {
      if (previous) {
        setRawAccounts((prev) => [previous, ...prev])
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir conta',
        description: getPortugueseError(err),
      })
      throw err
    }
  }

  return {
    accounts,
    activeAccounts: accounts.filter((a) => a.is_active !== false),
    totalBalance,
    isLoading,
    error,
    refetch: loadData,
    createAccount,
    updateAccount,
    deleteAccount,
  }
}
