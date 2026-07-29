import pb from '@/lib/pocketbase/client'
import type { AIConversationRecord } from '@/types/finance'

export const getConversations = (memberId: string) =>
  pb.collection('ai_conversations').getFullList<AIConversationRecord>({
    filter: `user_id = "${memberId}"`,
    sort: 'created',
  })

export const createConversation = (data: Partial<AIConversationRecord>) =>
  pb.collection('ai_conversations').create<AIConversationRecord>(data)

export const deleteConversation = (id: string) => pb.collection('ai_conversations').delete(id)

export const deleteAllConversations = (memberId: string) =>
  pb
    .collection('ai_conversations')
    .getFullList<AIConversationRecord>({
      filter: `user_id = "${memberId}"`,
    })
    .then((records) =>
      Promise.all(records.map((r) => pb.collection('ai_conversations').delete(r.id))),
    )
