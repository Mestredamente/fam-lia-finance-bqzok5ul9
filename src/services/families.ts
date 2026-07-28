import pb from '@/lib/pocketbase/client'
import type { FamilyRecord } from '@/types/finance'

export const getFamily = (id: string) => pb.collection('families').getOne<FamilyRecord>(id)

export const createFamily = (data: { name: string; invite_code: string; created_by: string }) =>
  pb.collection('families').create<FamilyRecord>(data)

export const updateFamily = (id: string, data: Partial<FamilyRecord>) =>
  pb.collection('families').update<FamilyRecord>(id, data)
