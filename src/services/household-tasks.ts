import pb from '@/lib/pocketbase/client'
import type {
  HouseholdTaskRecord,
  HouseholdTaskFilters,
  CompleteTaskOptions,
  CompleteTaskResult,
} from '@/types/household-tasks'

export const getTasksByFamilyId = (familyId: string, filters?: HouseholdTaskFilters) => {
  let filter = `family_id = "${familyId}"`
  if (filters?.status) filter += ` && status = "${filters.status}"`
  if (filters?.category) filter += ` && category = "${filters.category}"`
  if (filters?.assigned_to) filter += ` && assigned_to = "${filters.assigned_to}"`
  return pb.collection('household_tasks').getFullList<HouseholdTaskRecord>({
    filter,
    sort: '-created',
    expand: 'assigned_to,created_by,converted_transaction_id',
  })
}

export const createTask = (data: Partial<HouseholdTaskRecord>) =>
  pb.collection('household_tasks').create<HouseholdTaskRecord>(data)

export const updateTask = (id: string, data: Partial<HouseholdTaskRecord>) =>
  pb.collection('household_tasks').update<HouseholdTaskRecord>(id, data)

export const deleteTask = (id: string) => pb.collection('household_tasks').delete(id)

export const getUpcomingAndOverdueTasks = (familyId: string, daysAhead: number) => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const future = new Date(now)
  future.setDate(future.getDate() + daysAhead)
  const nowStr = now.toISOString().split('T')[0]
  const futureStr = future.toISOString().split('T')[0]
  return pb.collection('household_tasks').getFullList<HouseholdTaskRecord>({
    filter: `family_id = "${familyId}" && status != "completed" && status != "cancelled" && due_date != "" && due_date <= "${futureStr}"`,
    sort: 'due_date',
    expand: 'assigned_to,created_by',
  })
}

export const createNextOccurrence = async (
  task: HouseholdTaskRecord,
): Promise<HouseholdTaskRecord | null> => {
  if (!task.is_recurring || !task.recurrence_pattern || !task.due_date) return null
  const dueDate = new Date(task.due_date.split('T')[0] + 'T00:00:00')
  const nextDue = new Date(dueDate)
  switch (task.recurrence_pattern) {
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7)
      break
    case 'biweekly':
      nextDue.setDate(nextDue.getDate() + 15)
      break
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1)
      break
    case 'quarterly':
      nextDue.setMonth(nextDue.getMonth() + 3)
      break
    case 'annually':
      nextDue.setFullYear(nextDue.getFullYear() + 1)
      break
    default:
      return null
  }
  return pb.collection('household_tasks').create<HouseholdTaskRecord>({
    family_id: task.family_id,
    assigned_to: task.assigned_to,
    created_by: task.created_by,
    title: task.title,
    description: task.description || '',
    category: task.category,
    priority: task.priority,
    estimated_cost: task.estimated_cost || null,
    due_date: nextDue.toISOString().split('T')[0],
    status: 'pending',
    is_recurring: task.is_recurring,
    recurrence_pattern: task.recurrence_pattern,
    shopping_items: task.shopping_items || [],
  })
}

export const completeTaskService = async (
  taskId: string,
  familyId: string,
  options: CompleteTaskOptions,
): Promise<CompleteTaskResult> => {
  const task = await pb.collection('household_tasks').getOne<HouseholdTaskRecord>(taskId)
  const update: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  }
  if (options.actual_cost !== undefined && options.actual_cost !== null) {
    update.actual_cost = options.actual_cost
  }
  let transactionCreated = false
  let transactionAmount: number | null = null
  if (
    options.create_transaction &&
    options.actual_cost &&
    options.actual_cost > 0 &&
    options.transaction_category_id
  ) {
    const tx = await pb.collection('transactions').create({
      family_id: familyId,
      owner_id: options.transaction_owner_id || task.assigned_to || task.created_by,
      category_id: options.transaction_category_id,
      type: 'expense',
      amount: options.actual_cost,
      description: task.title,
      transaction_date: options.transaction_date || new Date().toISOString(),
      is_shared: true,
      is_fixed: false,
      source: 'manual',
    })
    update.converted_transaction_id = tx.id
    transactionCreated = true
    transactionAmount = options.actual_cost
  }
  const updated = await pb.collection('household_tasks').update<HouseholdTaskRecord>(taskId, update)
  let nextOccurrenceDate: string | null = null
  if (task.is_recurring && task.recurrence_pattern && task.due_date) {
    const next = await createNextOccurrence(task)
    if (next?.due_date) nextOccurrenceDate = next.due_date
  }
  return { task: updated, transactionCreated, transactionAmount, nextOccurrenceDate }
}
