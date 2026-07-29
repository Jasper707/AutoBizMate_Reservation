import { supabase } from '../../lib/supabaseClient'
import type { QueueItem, QueueSource } from './queueModels'

const QUEUE_ERROR = 'Could not load the queue. Try again.'
const ACTION_ERROR = 'That queue item could not be updated. Refresh and try again.'

function assertSupabase() {
  if (!supabase) throw new Error(QUEUE_ERROR)
  return supabase
}

export async function getStaffQueueToday() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('get_staff_queue_today')

  if (error) throw new Error(QUEUE_ERROR)
  return (data ?? []) as QueueItem[]
}

async function mutateQueueItem(
  functionName: 'start_queue_item' | 'complete_queue_item' | 'cancel_queue_item',
  sourceType: QueueSource,
  sourceId: string,
) {
  const client = assertSupabase()
  const { data, error } = await client.rpc(functionName, {
    p_source_type: sourceType,
    p_source_id: sourceId,
  })

  if (error) throw new Error(ACTION_ERROR)
  return data
}

export function startQueueItem(sourceType: QueueSource, sourceId: string) {
  return mutateQueueItem('start_queue_item', sourceType, sourceId)
}

export function completeQueueItem(sourceType: QueueSource, sourceId: string) {
  return mutateQueueItem('complete_queue_item', sourceType, sourceId)
}

export function cancelQueueItem(sourceType: QueueSource, sourceId: string) {
  return mutateQueueItem('cancel_queue_item', sourceType, sourceId)
}
