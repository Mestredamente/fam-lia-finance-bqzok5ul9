import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Upload,
  CreditCard,
  LayoutDashboard,
  List,
  CalendarClock,
  Wallet,
  PiggyBank,
  TrendingUp,
  Target,
  Trophy,
  LineChart,
  Search,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { usePrivacy } from '@/hooks/use-privacy'
import { formatDatePtBR } from '@/lib/utils'
import type { TransactionRecord } from '@/types/finance'

interface SearchResultTx {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  transaction_date: string
}

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { family } = useAuth()
  const { formatCurrency } = usePrivacy()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [txResults, setTxResults] = useState<SearchResultTx[]>([])
  const debounceTimerRef = useRef<any>(null)

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Clear query and results when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setTxResults([])
      setSearching(false)
    }
  }, [open])

  // Search transactions with debounce 300ms
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2 || !family?.id) {
      setTxResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const safeQuery = trimmed.replace(/["\\]/g, '')
        const filterStr = `family_id = "${family.id}" && description ~ "${safeQuery}"`
        const records = await pb.collection('transactions').getList<TransactionRecord>(1, 5, {
          filter: filterStr,
          sort: '-transaction_date',
        })
        setTxResults(
          records.items.map((r) => ({
            id: r.id,
            description: r.description,
            amount: r.amount,
            type: r.type,
            transaction_date: r.transaction_date,
          })),
        )
      } catch {
        setTxResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [query, family?.id])

  const handleSelect = (callback: () => void) => {
    onOpenChange(false)
    callback()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="O que você está procurando? (Ex: mercado, contas, nova transação...)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[360px] overflow-y-auto">
        <CommandEmpty>
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          ) : (
            'Nenhum resultado encontrado.'
          )}
        </CommandEmpty>

        {/* Section 1: Quick Actions */}
        <CommandGroup heading="Ações Rápidas">
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                window.dispatchEvent(new CustomEvent('ff-open-transaction-form'))
              })
            }
            className="cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-[#166534] dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center mr-2">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">Nova transação</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate('/cards')
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('ff-open-invoice-form'))
                }, 200)
              })
            }
            className="cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center mr-2">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">Importar fatura</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                window.dispatchEvent(new CustomEvent('ff-open-ddc-import'))
              })
            }
            className="cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center mr-2">
              <Upload className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">Importar DDC</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate('/contas')
              })
            }
            className="cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center mr-2">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">Pagar conta</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Section 2: Transaction Search Results (if available) */}
        {txResults.length > 0 && (
          <>
            <CommandGroup heading={`Transações (${txResults.length})`}>
              {txResults.map((tx) => (
                <CommandItem
                  key={tx.id}
                  onSelect={() =>
                    handleSelect(() => {
                      navigate(`/transacoes?q=${encodeURIComponent(tx.description)}`)
                    })
                  }
                  className="cursor-pointer justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDatePtBR(tx.transaction_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        tx.type === 'income'
                          ? 'text-[#22C55E]'
                          : 'text-gray-900 dark:text-foreground'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Section 3: Pages */}
        <CommandGroup heading="Páginas">
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/dashboard'))}
            className="cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/transacoes'))}
            className="cursor-pointer"
          >
            <List className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Transações</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/cards'))}
            className="cursor-pointer"
          >
            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Cartões</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/contas'))}
            className="cursor-pointer"
          >
            <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Contas a Pagar</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/orcamentos'))}
            className="cursor-pointer"
          >
            <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Orçamentos</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/patrimonio'))}
            className="cursor-pointer"
          >
            <PiggyBank className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Balanço</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/investimentos'))}
            className="cursor-pointer"
          >
            <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Investimentos</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/projections'))}
            className="cursor-pointer"
          >
            <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Projeções</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/metas'))}
            className="cursor-pointer"
          >
            <Target className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Metas</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/dividas'))}
            className="cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Dívidas</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/challenges'))}
            className="cursor-pointer"
          >
            <Trophy className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Desafios</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/evolucao'))}
            className="cursor-pointer"
          >
            <LineChart className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Evolução</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
