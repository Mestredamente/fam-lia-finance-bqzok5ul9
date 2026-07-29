import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCategoryIcon, PREDEFINED_ICONS, PREDEFINED_COLORS } from '@/lib/category-icons'
import { createCategory } from '@/services/categories'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { CategoryRecord, CategoryType } from '@/types/finance'

interface CategoryPickerProps {
  categories: CategoryRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  familyId: string
  type: CategoryType
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  familyId,
  type,
}: CategoryPickerProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PREDEFINED_COLORS[0])
  const [icon, setIcon] = useState(PREDEFINED_ICONS[0])
  const [loading, setLoading] = useState(false)

  const filtered = categories.filter((c) => c.type === type)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const created = await createCategory({
        family_id: familyId,
        name: name.trim(),
        type,
        icon,
        color,
        is_fixed: false,
        is_custom: true,
      })
      onSelect(created.id)
      setShowForm(false)
      setName('')
      toast({ title: 'Categoria criada!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar categoria' })
    } finally {
      setLoading(false)
    }
  }

  if (showForm) {
    return (
      <div className="space-y-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
        <Input
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {PREDEFINED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'w-7 h-7 rounded-full transition-all',
                  color === c && 'ring-2 ring-offset-2 ring-gray-400',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Ícone</label>
          <div className="flex gap-2 flex-wrap">
            {PREDEFINED_ICONS.map((i) => {
              const Icon = getCategoryIcon(i)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center border transition-all',
                    icon === i ? 'border-[#22C55E] bg-emerald-50' : 'border-gray-200 bg-white',
                  )}
                >
                  <Icon className="h-4 w-4 text-gray-700" />
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 bg-[#166534] hover:bg-[#15803D]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar categoria'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
      {filtered.map((cat) => {
        const Icon = getCategoryIcon(cat.icon)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
              selectedId === cat.id
                ? 'border-[#22C55E] bg-emerald-50'
                : 'border-gray-200 bg-white hover:bg-gray-50',
            )}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: cat.color + '20' }}
            >
              <Icon className="h-4 w-4" style={{ color: cat.color }} />
            </div>
            <span className="text-[10px] font-medium text-gray-600 text-center leading-tight truncate w-full">
              {cat.name}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex flex-col items-center gap-1 p-2 rounded-xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition-all"
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
          <Plus className="h-4 w-4 text-gray-500" />
        </div>
        <span className="text-[10px] font-medium text-gray-500 text-center">Criar nova</span>
      </button>
    </div>
  )
}
