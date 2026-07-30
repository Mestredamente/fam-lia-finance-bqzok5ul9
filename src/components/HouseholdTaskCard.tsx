import { ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { taskCategoryMeta, taskPriorityMeta, getDaysRemaining } from '@/lib/household-icons'
import { formatBRL } from '@/lib/utils'
import type { HouseholdTaskRecord } from '@/types/household-tasks'

interface Props {
  task: HouseholdTaskRecord
  onClick: () => void
}

export function HouseholdTaskCard({ task, onClick }: Props) {
  const catMeta = taskCategoryMeta[task.category]
  const CatIcon = catMeta.icon
  const priMeta = taskPriorityMeta[task.priority]
  const days = getDaysRemaining(task.due_date)
  const assignee = task.expand?.assigned_to
  const shoppingCount = (task.shopping_items || []).length

  return (
    <Card
      onClick={onClick}
      className="border border-gray-100 shadow-subtle hover:shadow-elevation rounded-2xl bg-white cursor-pointer transition-all"
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm text-gray-900 leading-tight">{task.title}</h3>
          <Badge
            className={`${priMeta.bg} ${priMeta.color} border-0 text-[9px] font-bold shrink-0`}
          >
            {priMeta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[9px] gap-1 px-1.5">
            <CatIcon className="h-2.5 w-2.5" style={{ color: catMeta.color }} />
            {catMeta.label}
          </Badge>
          {task.estimated_cost != null && task.estimated_cost > 0 && (
            <span className="text-[10px] text-gray-500">
              Estimado: {formatBRL(task.estimated_cost)}
            </span>
          )}
          {shoppingCount > 0 && (
            <Badge variant="outline" className="text-[9px] gap-1 px-1.5">
              <ClipboardList className="h-2.5 w-2.5" />
              {shoppingCount} {shoppingCount === 1 ? 'item' : 'itens'}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between">
          {days ? (
            <span className={`text-[10px] font-medium ${days.color}`}>{days.text}</span>
          ) : (
            <span className="text-[10px] text-gray-400">Sem prazo</span>
          )}
          {assignee && (
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-emerald-100 text-[#166534]">
                  {assignee.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-gray-500">{assignee.display_name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
