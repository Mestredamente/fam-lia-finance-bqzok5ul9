import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { createCategory, updateCategory, deleteCategory } from '@/services/categories'
import { getCategoryIcon, PREDEFINED_ICONS, PREDEFINED_COLORS } from '@/lib/category-icons'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { CategoryRecord, CategoryType } from '@/types/finance'

const TYPE_LABELS: Record<CategoryType, string> = {
  expense: 'Despesa',
  income: 'Receita',
  investment: 'Investimento',
  debt: 'Dívida',
}

export default function Categories() {
  const navigate = useNavigate()
  const { family, user } = useAuth()
  const { categories, loading, refetch } = useCategories(family?.id)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [icon, setIcon] = useState(PREDEFINED_ICONS[0])
  const [color, setColor] = useState(PREDEFINED_COLORS[0])
  const [isFixed, setIsFixed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setName('')
    setType('expense')
    setIcon(PREDEFINED_ICONS[0])
    setColor(PREDEFINED_COLORS[0])
    setIsFixed(false)
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (cat: CategoryRecord) => {
    setEditingId(cat.id)
    setName(cat.name)
    setType(cat.type)
    setIcon(cat.icon || PREDEFINED_ICONS[0])
    setColor(cat.color || PREDEFINED_COLORS[0])
    setIsFixed(cat.is_fixed)
    setFieldErrors({})
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!family || !name.trim()) return
    setSaving(true)
    setFieldErrors({})
    try {
      const data = {
        family_id: family.id,
        name: name.trim(),
        type,
        icon,
        color,
        is_fixed: isFixed,
        created_by: user?.id,
        ...(editingId ? {} : { is_custom: true }),
      }
      if (editingId) {
        await updateCategory(editingId, data)
        toast({ title: 'Categoria atualizada!' })
      } else {
        await createCategory(data)
        toast({ title: 'Categoria criada!' })
      }
      setDialogOpen(false)
      refetch()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao salvar categoria' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCategory(deleteId)
      toast({ title: 'Categoria excluída' })
      setDeleteId(null)
      refetch()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao excluir categoria' })
    }
  }

  if (!family) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-xs text-gray-500">Gerencie suas categorias financeiras</p>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-[#166534] hover:bg-[#15803D]">
          <Plus className="h-4 w-4 mr-1.5" /> Nova
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border border-gray-100 shadow-subtle rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Tag className="h-6 w-6 text-[#166534]" />
            </div>
            <p className="text-sm text-gray-500">Nenhuma categoria criada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(Object.keys(TYPE_LABELS) as CategoryType[]).map((t) => {
            const cats = categories.filter((c) => c.type === t)
            if (cats.length === 0) return null
            return (
              <div key={t} className="space-y-2">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {TYPE_LABELS[t]}
                </h2>
                {cats.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon)
                  return (
                    <Card
                      key={cat.id}
                      className="border border-gray-100 shadow-subtle rounded-2xl bg-white"
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: (cat.color || '#999') + '20' }}
                          >
                            <Icon className="h-4 w-4" style={{ color: cat.color || '#999' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-900 truncate">{cat.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {cat.is_fixed && (
                                <Badge variant="outline" className="text-[10px]">
                                  Fixa
                                </Badge>
                              )}
                              {cat.is_custom && (
                                <Badge variant="outline" className="text-[10px]">
                                  Personalizada
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(cat)}
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(cat.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mercado"
                className="mt-1"
              />
              {fieldErrors.name && <p className="text-sm text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as CategoryType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.type && <p className="text-sm text-red-500 mt-1">{fieldErrors.type}</p>}
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">Cor</Label>
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
              <Label className="text-xs font-semibold text-gray-700 mb-1 block">Ícone</Label>
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
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <Label className="text-sm font-medium text-gray-700">Despesa fixa</Label>
              <Switch checked={isFixed} onCheckedChange={setIsFixed} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-[#166534] hover:bg-[#15803D]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta categoria?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              A categoria será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
