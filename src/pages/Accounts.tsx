import { useState } from 'react'
import {
  Plus,
  Landmark,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Receipt,
  Layers,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAccounts } from '@/hooks/use-accounts'
import { getAccountTransactions } from '@/services/accounts'
import { AccountFormSheet, getAccountIcon } from '@/components/AccountFormSheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBRL, cn } from '@/lib/utils'
import type { Account, AccountType } from '@/types/accounts'
import type { TransactionRecord } from '@/types/finance'

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  investment: 'Investimento',
}

export default function Accounts() {
  const { family } = useAuth()
  const {
    accounts,
    activeAccounts,
    totalBalance,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccounts(family?.id)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)

  // Statement dialog
  const [selectedAccountForStatement, setSelectedAccountForStatement] = useState<Account | null>(
    null,
  )
  const [statementTransactions, setStatementTransactions] = useState<TransactionRecord[]>([])
  const [loadingStatement, setLoadingStatement] = useState(false)

  const handleOpenCreate = () => {
    setEditingAccount(null)
    setSheetOpen(true)
  }

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc)
    setSheetOpen(true)
  }

  const handleSaveAccount = async (data: {
    name: string
    type: AccountType
    bank?: string
    initial_balance: number
    color?: string
    icon?: string
    is_active?: boolean
  }) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, data)
    } else {
      await createAccount(data)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return
    await deleteAccount(deletingAccount.id)
    setDeletingAccount(null)
  }

  const handleOpenStatement = async (acc: Account) => {
    setSelectedAccountForStatement(acc)
    setLoadingStatement(true)
    try {
      const txs = await getAccountTransactions(acc.id)
      setStatementTransactions(txs)
    } catch {
      setStatementTransactions([])
    } finally {
      setLoadingStatement(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-foreground">
            Contas Bancárias
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie suas contas correntes, poupanças, carteiras e acompanhe os saldos.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#166534] hover:bg-[#15803D] text-white gap-2 shrink-0 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar Conta
        </Button>
      </div>

      {/* Top Total Card */}
      <Card className="border-none shadow-subtle bg-gradient-to-br from-[#166534] to-[#15803D] text-white rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Total em Contas ({activeAccounts.length}{' '}
                {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'})
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1">
                {isLoading ? (
                  <Skeleton className="h-9 w-40 bg-emerald-700/50" />
                ) : (
                  formatBRL(totalBalance)
                )}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && accounts.length === 0 && (
        <Card className="border-dashed border-2 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-card/50">
          <CardContent className="flex flex-col items-center justify-center p-0 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-[#166534] dark:text-emerald-400">
              <Landmark className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-foreground">
                Nenhuma conta cadastrada
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Cadastre suas contas bancárias para organizar seu saldo, transferências e fluxo de
                caixa.
              </p>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="bg-[#166534] hover:bg-[#15803D] text-white gap-2 mt-2"
            >
              <Plus className="h-4 w-4" />
              Cadastrar primeira conta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accounts Grid */}
      {!isLoading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const IconComp = getAccountIcon(acc.icon)
            const balance = acc.current_balance || 0
            const isNegative = balance < 0
            const cardColor = acc.color || '#10B981'

            return (
              <Card
                key={acc.id}
                onClick={() => handleOpenStatement(acc)}
                className={cn(
                  'cursor-pointer border border-gray-200 dark:border-gray-800 rounded-2xl shadow-subtle hover:shadow-md transition-all overflow-hidden relative group bg-white dark:bg-card',
                  acc.is_active === false && 'opacity-60 bg-gray-50/50',
                )}
              >
                {/* Accent top line with account color */}
                <div className="h-1.5 w-full" style={{ backgroundColor: cardColor }} />

                <CardContent className="p-5 space-y-4">
                  {/* Top: Icon + Name + Bank + Menu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: cardColor + '20', color: cardColor }}
                      >
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-gray-900 dark:text-foreground truncate">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {acc.bank ? `${acc.bank} · ` : ''}
                          {TYPE_LABELS[acc.type] || 'Conta'}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {acc.is_active === false && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-gray-500 border-gray-300"
                        >
                          Inativa
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(acc)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingAccount(acc)}
                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Saldo Atual */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block">
                        Saldo Atual
                      </span>
                      <span
                        className={cn(
                          'text-xl font-extrabold tracking-tight',
                          isNegative
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-foreground',
                        )}
                      >
                        {formatBRL(balance)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Saldo inicial</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {formatBRL(Number(acc.initial_balance || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Footer hint */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1">
                    <span className="inline-flex items-center gap-1">
                      <Receipt className="h-3 w-3" /> Ver extrato
                    </span>
                    <span className="text-[10px]">{TYPE_LABELS[acc.type]}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sheet de Criação / Edição */}
      <AccountFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        account={editingAccount}
        onSave={handleSaveAccount}
      />

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{deletingAccount?.name}</strong>? As
              transações já associadas a ela não serão apagadas, mas perderão a vinculação com esta
              conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Extrato da Conta */}
      <Dialog
        open={!!selectedAccountForStatement}
        onOpenChange={(open) => !open && setSelectedAccountForStatement(null)}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedAccountForStatement && (
                <>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: selectedAccountForStatement.color || '#10B981' }}
                  >
                    {(() => {
                      const IconComp = getAccountIcon(selectedAccountForStatement.icon)
                      return <IconComp className="h-4 w-4" />
                    })()}
                  </div>
                  <span>Extrato: {selectedAccountForStatement.name}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Saldo atual:{' '}
              <strong>{formatBRL(selectedAccountForStatement?.current_balance || 0)}</strong>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4 my-2">
            {loadingStatement ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : statementTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 space-y-2">
                <Layers className="h-8 w-8 mx-auto text-gray-300" />
                <p className="text-sm font-medium">Nenhuma transação vinculada a esta conta.</p>
                <p className="text-xs text-gray-400">
                  Ao criar despesas, receitas ou transferências, selecione esta conta para
                  visualizá-las aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {statementTransactions.map((t) => {
                  const isTransfer = t.type === 'transfer'
                  const isDest =
                    isTransfer && t.transfer_to_account_id === selectedAccountForStatement?.id
                  const isOrigin = isTransfer && t.account_id === selectedAccountForStatement?.id
                  const isIncome = t.type === 'income' || (isTransfer && isDest)

                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            isTransfer
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                              : isIncome
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
                          )}
                        >
                          {isTransfer ? (
                            <ArrowLeftRight className="h-4 w-4" />
                          ) : isIncome ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-foreground truncate">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t.transaction_date.split('T')[0].split('-').reverse().join('/')}
                            {isTransfer && isOrigin && ' · Transferência enviada'}
                            {isTransfer && isDest && ' · Transferência recebida'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            isIncome
                              ? 'text-[#166534] dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {isIncome ? '+ ' : '- '}
                          {formatBRL(t.amount)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
