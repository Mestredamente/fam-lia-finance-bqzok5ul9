import React from 'react'
import {
  Trophy,
  CheckSquare,
  Check,
  X,
  Loader2,
  Calendar,
  DollarSign,
  Tag,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'

interface ActionConfirmationCardProps {
  action: 'create_challenge' | 'create_task' | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
  summary: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const challengeTypeLabels: Record<string, string> = {
  savings: 'Meta de Economia',
  savings_goal: 'Meta de Economia',
  spending_cut: 'Corte de Gastos',
  category_cut: 'Corte de Gastos',
  no_spend: 'Sem Gastos (Congelamento)',
  spending_freeze: 'Congelamento de Gastos',
  no_impulse: 'Sem Impulso',
  emotional_awareness: 'Consciência Emocional',
  custom: 'Desafio Personalizado',
}

const taskCategoryLabels: Record<string, string> = {
  maintenance: 'Manutenção',
  repair: 'Conserto / Reparo',
  purchase: 'Compra',
  appointment: 'Compromisso',
  deadline: 'Prazo',
  subscription_review: 'Revisão de Assinaturas',
  planning: 'Planejamento',
  other: 'Outro',
}

const taskPriorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  medium: { label: 'Média', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'Alta', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  urgent: { label: 'Urgente', color: 'bg-red-50 text-red-700 border-red-200' },
}

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length >= 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

export function ActionConfirmationCard({
  action,
  params,
  summary,
  onConfirm,
  onCancel,
  loading = false,
}: ActionConfirmationCardProps) {
  const isChallenge = action === 'create_challenge'
  const isTask = action === 'create_task'

  const title = (params?.title as string) || 'Sem título'
  const description = (params?.description as string) || ''

  // Desafio
  const targetValue = params?.target_value ? Number(params.target_value) : null
  const challengeType = (params?.type as string) || 'savings_goal'
  const challengeTypeLabel = challengeTypeLabels[challengeType] || challengeType
  const startDate = params?.start_date as string | undefined
  const endDate = params?.end_date as string | undefined

  // Tarefa
  const taskCategory = (params?.category as string) || 'planning'
  const taskCategoryLabel = taskCategoryLabels[taskCategory] || taskCategory
  const taskPriority = (params?.priority as string) || 'medium'
  const priorityInfo = taskPriorityLabels[taskPriority] || taskPriorityLabels.medium
  const estimatedCost = params?.estimated_cost ? Number(params.estimated_cost) : null
  const dueDate = params?.due_date as string | undefined

  return (
    <div
      className={`rounded-2xl border p-4 my-2 transition-all shadow-sm ${
        isChallenge
          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
          : 'bg-amber-50/70 border-amber-300 text-amber-950'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-black/10">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isChallenge ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}
        >
          {isChallenge ? <Trophy className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-black/60">
              Ação Sugerida pela IA
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] h-4 px-1.5 font-medium ${
                isChallenge
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-100/50'
                  : 'border-amber-500 text-amber-700 bg-amber-100/50'
              }`}
            >
              {isChallenge ? 'Novo Desafio' : 'Nova Tarefa'}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {isChallenge ? 'Criar Desafio Financeiro' : 'Criar Tarefa Doméstica'}
          </p>
        </div>
      </div>

      {/* Summary message */}
      {summary && (
        <p className="text-xs text-gray-700 mt-2.5 mb-3 italic bg-white/60 p-2 rounded-lg border border-black/5">
          "{summary}"
        </p>
      )}

      {/* Detail Card */}
      <div className="bg-white rounded-xl p-3.5 border border-black/10 shadow-xs space-y-2.5 text-xs text-gray-800">
        <div>
          <div className="font-bold text-sm text-gray-900 mb-0.5">{title}</div>
          {description && <div className="text-gray-600 leading-relaxed">{description}</div>}
        </div>

        <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {isChallenge && (
            <>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  Tipo: <strong className="text-gray-900">{challengeTypeLabel}</strong>
                </span>
              </div>

              {targetValue !== null && targetValue > 0 && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Meta:{' '}
                    <strong className="text-emerald-700 font-semibold">
                      {formatBRL(targetValue)}
                    </strong>
                  </span>
                </div>
              )}

              {(startDate || endDate) && (
                <div className="flex items-center gap-1.5 text-gray-600 sm:col-span-2">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Período:{' '}
                    <strong className="text-gray-900">
                      {startDate ? formatDateDisplay(startDate) : 'Hoje'} →{' '}
                      {endDate ? formatDateDisplay(endDate) : '30 dias'}
                    </strong>
                  </span>
                </div>
              )}
            </>
          )}

          {isTask && (
            <>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  Categoria: <strong className="text-gray-900">{taskCategoryLabel}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-gray-600">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Prioridade:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${priorityInfo.color}`}
                >
                  {priorityInfo.label}
                </span>
              </div>

              {estimatedCost !== null && estimatedCost > 0 && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <DollarSign className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    Custo estimado:{' '}
                    <strong className="text-amber-700 font-semibold">
                      {formatBRL(estimatedCost)}
                    </strong>
                  </span>
                </div>
              )}

              {dueDate && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    Data Limite:{' '}
                    <strong className="text-gray-900">{formatDateDisplay(dueDate)}</strong>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={loading}
          className="h-8 text-xs border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancelar
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={loading}
          className={`h-8 text-xs text-white ${
            isChallenge ? 'bg-[#166534] hover:bg-[#15803D]' : 'bg-[#d97706] hover:bg-[#b45309]'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              Confirmar e Criar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
export default ActionConfirmationCard
