import {
  Wrench,
  Hammer,
  ShoppingCart,
  Calendar,
  Clock,
  RefreshCw,
  Map,
  File,
  type LucideIcon,
} from 'lucide-react'
import type {
  HouseholdTaskCategory,
  HouseholdTaskPriority,
  HouseholdTaskStatus,
  RecurrencePattern,
} from '@/types/household-tasks'

interface TaskTypeMeta {
  label: string
  icon: LucideIcon
  color: string
}

export const taskCategoryMeta: Record<HouseholdTaskCategory, TaskTypeMeta> = {
  maintenance: { label: 'Manutenção', icon: Wrench, color: '#3B82F6' },
  repair: { label: 'Reparo', icon: Hammer, color: '#F97316' },
  purchase: { label: 'Compra', icon: ShoppingCart, color: '#22C55E' },
  appointment: { label: 'Agendamento', icon: Calendar, color: '#EC4899' },
  deadline: { label: 'Prazo', icon: Clock, color: '#EF4444' },
  subscription_review: { label: 'Revisão de Assinatura', icon: RefreshCw, color: '#8B5CF6' },
  planning: { label: 'Planejamento', icon: Map, color: '#14B8A6' },
  other: { label: 'Outro', icon: File, color: '#6B7280' },
}

export const taskPriorityMeta: Record<
  HouseholdTaskPriority,
  { label: string; color: string; bg: string; border: string }
> = {
  low: { label: 'Baixa', color: 'text-[#22C55E]', bg: 'bg-emerald-50', border: 'border-[#22C55E]' },
  medium: {
    label: 'Média',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
  },
  high: {
    label: 'Alta',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-500',
  },
  urgent: { label: 'Urgente', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500' },
}

export const taskStatusMeta: Record<
  HouseholdTaskStatus,
  { label: string; color: string; bg: string; headerBg: string }
> = {
  pending: {
    label: 'Pendentes',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    headerBg: 'bg-yellow-100',
  },
  in_progress: {
    label: 'Em Andamento',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    headerBg: 'bg-blue-100',
  },
  completed: {
    label: 'Concluídas',
    color: 'text-[#166534]',
    bg: 'bg-emerald-50',
    headerBg: 'bg-emerald-100',
  },
  cancelled: {
    label: 'Canceladas',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    headerBg: 'bg-gray-100',
  },
}

export const recurrenceLabels: Record<RecurrencePattern, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  annually: 'Anual',
}

export const taskToCategoryName: Record<HouseholdTaskCategory, string> = {
  maintenance: 'Moradia',
  repair: 'Moradia',
  purchase: 'Mercado',
  appointment: 'Saúde',
  deadline: 'Educação',
  subscription_review: 'Assinaturas',
  planning: 'Outros',
  other: 'Outros',
}

export function getDaysRemaining(
  dueDate: string | null,
): { text: string; color: string; isOverdue: boolean } | null {
  if (!dueDate) return null
  const due = new Date(dueDate.split('T')[0] + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)
    return { text: `Atrasado ${Math.abs(diff)}d`, color: 'text-red-600', isOverdue: true }
  if (diff === 0) return { text: 'Hoje!', color: 'text-orange-600', isOverdue: false }
  if (diff === 1) return { text: 'Faltam 1 dia', color: 'text-gray-600', isOverdue: false }
  return { text: `Faltam ${diff} dias`, color: 'text-gray-600', isOverdue: false }
}
