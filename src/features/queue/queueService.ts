import { supabase } from '../../lib/supabaseClient'
import type { QueueItem, QueueMutationResult } from './queueModels'

const QUEUE_ERROR = 'Could not load the queue. Try again.'
const ACTION_ERROR = 'That queue item could not be updated. Refresh and try again.'

function assertSupabase() {
  if (!supabase) throw new Error(QUEUE_ERROR)
  return supabase
}

export async function getStaffQueueToday() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('get_ordered_staff_queue')

  if (error) throw new Error(QUEUE_ERROR)
  return (data ?? []) as QueueItem[]
}

async function mutateQueueItem(
  functionName:
    | 'start_queue_item'
    | 'complete_queue_item'
    | 'requeue_in_service_item'
    | 'cancel_queued_item',
  queueEntryId: string,
) {
  const client = assertSupabase()
  const { data, error } = await client.rpc(functionName, {
    p_queue_entry_id: queueEntryId,
  })

  if (error) throw new Error(ACTION_ERROR)
  return data as QueueMutationResult
}

export function startQueueItem(queueEntryId: string) {
  return mutateQueueItem('start_queue_item', queueEntryId)
}

export function completeQueueItem(queueEntryId: string) {
  return mutateQueueItem('complete_queue_item', queueEntryId)
}

export function requeueInServiceItem(queueEntryId: string) {
  return mutateQueueItem('requeue_in_service_item', queueEntryId)
}

export function cancelQueuedItem(queueEntryId: string) {
  return mutateQueueItem('cancel_queued_item', queueEntryId)
}
