import { useNavigate } from 'react-router-dom'
import { TrendingUp, Wallet, LineChart, Bot, Tags } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const MORE_ITEMS = [
  { label: 'Patrimônio', path: '/patrimonio', icon: TrendingUp },
  { label: 'Orçamentos', path: '/orcamentos', icon: Wallet },
  { label: 'Evolução', path: '/evolucao', icon: LineChart },
  { label: 'Consultora', path: '/consultora', icon: Bot },
  { label: 'Regras de Categorização', path: '/regras-categorizacao', icon: Tags },
]

export function MoreMenu({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const navigate = useNavigate()

  const handleNavigate = (path: string) => {
    navigate(path)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Mais opções</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 mt-4 pb-4">
          {MORE_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <item.icon className="h-6 w-6 text-[#166534]" aria-hidden="true" />
              <span className="text-xs font-medium text-gray-700 text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
