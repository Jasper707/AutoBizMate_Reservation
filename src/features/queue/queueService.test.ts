import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueueItem } from './queueModels'

const rpc = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { rpc },
}))

import { getStaffQueueToday } from './queueService'

const rows: QueueItem[] = [
  {
    source_type: 'booking',
    source_id: '1',
    reference_id: 'BK-1',
    company: 'sample_company',
    employee_code: 'EMP-001',
    customer_name: 'Booking Customer',
    service_code: 'haircut',
    service_name: 'Haircut',
    queue_date: '2026-07-29',
    scheduled_date: '2026-07-29',
    scheduled_start_time: '10:00:00',
    joined_at: '2026-07-29T09:00:00+08:00',
    arrived_at: '2026-07-29T10:00:00+08:00',
    service_started_at: null,
    status: 'confirmed',
    notes: 'Use fragrance-free products.',
    arrival_verification_source: 'chatbot_daily_question',
    queue_position: null,
    priority_group: 2,
    priority_time: '2026-07-29T10:00:00+08:00',
  },
  {
    source_type: 'waiting_list',
    source_id: '2',
    reference_id: 'WL-2',
    company: 'sample_company',
    employee_code: 'EMP-001',
    customer_name: 'Waiting Customer',
    service_code: 'haircut',
    service_name: 'Haircut',
    queue_date: '2026-07-29',
    scheduled_date: null,
    scheduled_start_time: null,
    joined_at: '2026-07-29T10:05:00+08:00',
    arrived_at: '2026-07-29T10:05:00+08:00',
    service_started_at: null,
    status: 'confirmed',
    notes: null,
    arrival_verification_source: null,
    queue_position: 1,
    priority_group: 3,
    priority_time: '2026-07-29T10:05:00+08:00',
  },
]

describe('getStaffQueueToday', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('preserves booking and waiting-list note fields returned by the RPC', async () => {
    rpc.mockResolvedValue({ data: rows, error: null })

    const result = await getStaffQueueToday()

    expect(rpc).toHaveBeenCalledWith('get_staff_queue_today')
    expect(result).toEqual(rows)
    expect(result[0].notes).toBe('Use fragrance-free products.')
    expect(result[1].notes).toBeNull()
  })
})
