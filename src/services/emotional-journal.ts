import pb from '@/lib/pocketbase/client'
import type { EmotionalJournalRecord } from '@/types/finance'

export const getJournalEntries = (memberId: string, month?: number, year?: number) => {
  let filter = `user_id = "${memberId}"`
  if (month !== undefined && year !== undefined) {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const nextMonth = month === 11 ? { m: 0, y: year + 1 } : { m: month + 1, y: year }
    const endDate = `${nextMonth.y}-${String(nextMonth.m + 1).padStart(2, '0')}-01`
    filter += ` && created >= "${startDate}" && created < "${endDate}"`
  }
  return pb.collection('emotional_journal').getFullList<EmotionalJournalRecord>({
    filter,
    sort: '-created',
    expand: 'transaction_id',
  })
}

export const createJournalEntry = (data: Partial<EmotionalJournalRecord>) =>
  pb.collection('emotional_journal').create<EmotionalJournalRecord>(data)

export const updateJournalEntry = (id: string, data: Partial<EmotionalJournalRecord>) =>
  pb.collection('emotional_journal').update<EmotionalJournalRecord>(id, data)

export const deleteJournalEntry = (id: string) => pb.collection('emotional_journal').delete(id)
