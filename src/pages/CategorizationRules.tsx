import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCategorizationRules } from '@/hooks/use-categorization-rules'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { createRule, updateRule, deleteRule } from '@/services/categorization-rules'
import { toast } from '@/hooks/use-toast'
import { getPortugueseError } from '@/lib/error-utils'
import type { CategorizationRuleRecord } from '@/types/categorization-rules'

const ADMIN_ROLES = ['husband', 'wife', 'partner']

export default function CategorizationRules() {
  const navigate = useNavigate()
  const { family, member, user } = useAuth()
  const { rules, loading, refetch } = useCategorizationRules(family?.id)
  const { categories } = useCategories(family?.id)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [matchType, setMatchType] = useState<'contains' | 'starts_with'>('contains')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const isAdmin = ADMIN_ROLES.includes(member?.role || '')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const openCreate = () => {
    setEditingId(null)
    setKeyword('')
    setCategoryId('')
    setMatchType('contains')
    setDialogOpen(true)
  }

  const openEdit = (rule: CategorizationRuleRecord) => {
    setEditingId(rule.id)
    setKeyword(rule.keyword)
    setCategoryId(rule.category_id)
    setMatchType(rule.match_type)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!family || !keyword.trim() || !categoryId) return
    setSaving(true)
    try {
      const data = {
        family_id: family.id,
        keyword: keyword.trim(),
        category_id: categoryId,
        match_type: matchType,
        created_by: user?.id,
      }
      if (editingId) {
        await updateRule(editingId, data)
        toast({ title: 'Regra atualizada!' })
      } else {
        await createRule(data)
        toast({ title: 'Regra criada!' })
      }
      setDialogOpen(false)
      refetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteRule(deleteId)
      toast({ title: 'Regra excluída' })
      setDeleteId(null)
      refetch()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getPortugueseError(err) })
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
          <h1 className="text-2xl font-bold text-gray-900">Regras de Categorização</h1>
          <p className="text-xs text-gray-500">Categorização automática de transações</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/categorias')}>
            <Tag className="h-4 w-4 mr-1.5" /> Categorias
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreate} className="bg-[#166534] hover:bg-[#15803D]">
              <Plus className="h-4 w-4 mr-1.5" /> Nova regra
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card className="border border-gray-100 shadow-subtle rounded-2xl">
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Tag className="h-6 w-6 text-[#166534]" />
            </div>
            <p className="text-sm text-gray-500">
              Nenhuma regra criada. Crie regras para categorizar transações automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const cat = rule.expand?.category_id
            return (
              <Card
                key={rule.id}
                className="border border-gray-100 shadow-subtle rounded-2xl bg-white"
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900">"{rule.keyword}"</span>
                      <Badge variant="outline" className="text-xs">
                        {rule.match_type === 'contains' ? 'contém' : 'começa com'}
                      </Badge>
                      <span className="text-xs text-gray-400">→</span>
                      <Badge
                        className="text-xs"
                        style={{
                          backgroundColor: (cat?.color || '#999') + '20',
                          color: cat?.color || '#999',
                        }}
                      >
                        {cat?.name || 'Sem categoria'}
                      </Badge>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(rule)}
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Palavra-chave</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: supermercado"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Tipo de correspondência</Label>
              <Select
                value={matchType}
                onValueChange={(v) => setMatchType(v as 'contains' | 'starts_with')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="starts_with">Começa com</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !keyword.trim() || !categoryId}
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
            <AlertDialogTitle>Excluir esta regra?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              A regra será removida permanentemente.
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
