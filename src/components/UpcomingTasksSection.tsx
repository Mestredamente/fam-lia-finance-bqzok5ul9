import { useNavigate } from 'react-router-dom'
import { ClipboardList, AlertCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUpcomingTasks } from '@/hooks/use-upcoming-tasks'
import { taskCategoryMeta, getDaysRemaining } from '@/lib/household-icons'
import { formatBRL } from '@/lib/utils'

interface Props {
  familyId: string
}

export function UpcomingTasksSection({ familyId }: Props) {
  const navigate = useNavigate()
  const { tasks, totalEstimatedCost, overdueCount, loading } = useUpcomingTasks(familyId, 7)

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Próximos compromissos</h2>
        <Skeleton className="h-32 rounded-2xl" />
      </section>
    )
  }

  if (tasks.length === 0 && overdueCount === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Próximos compromissos</h2>
        <Card className="border-dashed border-gray-200 rounded-2xl bg-white">
          <CardContent className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-500">
              Nenhum compromisso próximo. Adicione tarefas no Planejador.
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900">Próximos compromissos</h2>
        {overdueCount > 0 && (
          <Badge className="bg-red-100 text-red-700 border-0">
            <AlertCircle className="h-3 w-3 mr-1" />
            {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const catMeta = taskCategoryMeta[task.category]
          const CatIcon = catMeta.icon
          const days = getDaysRemaining(task.due_date)
          const assignee = task.expand?.assigned_to
          return (
            <Card
              key={task.id}
              className="border border-gray-100 shadow-subtle rounded-2xl bg-white cursor-pointer hover:shadow-elevation transition-all"
              onClick={() => navigate('/casa')}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: catMeta.color + '20' }}
                >
                  <CatIcon className="h-4 w-4" style={{ color: catMeta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2">
                    {days && <span className={`text-xs ${days.color}`}>{days.text}</span>}
                    {task.estimated_cost != null && task.estimated_cost > 0 && (
                      <span className="text-xs text-gray-500">
                        {formatBRL(task.estimated_cost)}
                      </span>
                    )}
                  </div>
                </div>
                {assignee && (
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-emerald-100 text-[#166534]">
                      {assignee.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {formatBRL(totalEstimatedCost)} em compromissos pendentes
        </span>
        <Button variant="outline" size="sm" onClick={() => navigate('/casa')}>
          Ver todas
        </Button>
      </div>
    </section>
  )
}
