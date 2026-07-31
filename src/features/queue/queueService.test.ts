import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueueItem } from './queueModels'

const rpc = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { rpc },
}))

import {
  cancelQueuedItem,
  completeQueueItem,
  getStaffQueueToday,
  requeueInServiceItem,
  startQueueItem,
} from './queueService'

const rows: QueueItem[] = [
  {
    queue_entry_id: '00000000-0000-4000-a000-000000000001',
    queue_number: 1,
    source_type: 'booking',
    source_reference: 'BK-1',
    customer_name: 'Booking Customer',
    customer_chat_id: '101',
    service_code: 'haircut',
    service_name: 'Haircut',
    scheduled_start_time: '10:00:00',
    scheduled_end_time: '11:00:00',
    scheduled_priority_eligible: true,
    arrived_at: '2026-07-29T10:00:00+08:00',
    queue_order_at: '2026-07-29T10:00:00+08:00',
    requeued_at: null,
    service_started_at: null,
    status: 'queued',
    notes: 'Use fragrance-free products.',
    is_next_locked: false,
    priority_group: 3,
    live_position: 1,
  },
  {
    queue_entry_id: '00000000-0000-4000-a000-000000000002',
    queue_number: 2,
    source_type: 'waiting_list',
    source_reference: 'WL-2',
    customer_name: 'Waiting Customer',
    customer_chat_id: '102',
    service_code: 'haircut',
    service_name: 'Haircut',
    scheduled_start_time: null,
    scheduled_end_time: null,
    scheduled_priority_eligible: false,
    arrived_at: '2026-07-29T10:05:00+08:00',
    queue_order_at: '2026-07-29T10:05:00+08:00',
    requeued_at: null,
    service_started_at: null,
    status: 'queued',
    notes: null,
    is_next_locked: false,
    priority_group: 4,
    live_position: 2,
  },
]

describe('getStaffQueueToday', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('preserves booking and waiting-list note fields returned by the RPC', async () => {
    rpc.mockResolvedValue({ data: rows, error: null })

    const result = await getStaffQueueToday()

    expect(rpc).toHaveBeenCalledWith('get_ordered_staff_queue')
    expect(result).toEqual(rows)
    expect(result[0].notes).toBe('Use fragrance-free products.')
    expect(result[1].notes).toBeNull()
  })

  it.each([
    ['start_queue_item', startQueueItem],
    ['requeue_in_service_item', requeueInServiceItem],
    ['cancel_queued_item', cancelQueuedItem],
    ['complete_queue_item', completeQueueItem],
  ] as const)('calls %s with only the authorized queue-entry UUID', async (functionName, mutation) => {
    rpc.mockResolvedValue({ data: { success: true, action: functionName }, error: null })
    await mutation('00000000-0000-4000-a000-000000000001')
    expect(rpc).toHaveBeenCalledWith(functionName, {
      p_queue_entry_id: '00000000-0000-4000-a000-000000000001',
    })
  })
})
