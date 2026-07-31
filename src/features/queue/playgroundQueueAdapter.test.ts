import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueueItem } from './queueModels'

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }) },
}))

import {
  addPlaygroundItem,
  loadPlaygroundQueue,
  mutatePlaygroundQueue,
  orderPlaygroundQueue,
} from './playgroundQueueAdapter'

function item(overrides: Partial<QueueItem>): QueueItem {
  return {
    queue_entry_id: crypto.randomUUID(), queue_number: 1,
    source_type: 'waiting_list', source_reference: 'DEMO-1',
    customer_name: 'Customer', customer_chat_id: null,
    service_code: 'haircut', service_name: 'Haircut', notes: null,
    scheduled_start_time: null, scheduled_end_time: null,
    scheduled_priority_eligible: false, arrived_at: '2026-07-31T08:00:00.000Z',
    queue_order_at: '2026-07-31T08:00:00.000Z', requeued_at: null,
    service_started_at: null, status: 'queued', is_next_locked: false,
    priority_group: 4, live_position: 1,
    ...overrides,
  }
}

describe('playground queue adapter', () => {
  beforeEach(() => sessionStorage.clear())

  it('orders in-service, locked next, scheduled now, then normal queue', () => {
    const at = new Date('2026-07-31T10:30:00')
    const rows = [
      item({ customer_name: 'Normal', queue_number: 4 }),
      item({ customer_name: 'Scheduled', queue_number: 3, source_type: 'booking', scheduled_priority_eligible: true, scheduled_start_time: '10:00:00', scheduled_end_time: '11:00:00' }),
      item({ customer_name: 'Next', queue_number: 2, is_next_locked: true }),
      item({ customer_name: 'Serving', queue_number: 1, status: 'in_service', service_started_at: '2026-07-31T10:00:00.000Z' }),
    ]

    expect(orderPlaygroundQueue(rows, at).map((row) => row.customer_name)).toEqual([
      'Serving', 'Next', 'Scheduled', 'Normal',
    ])
  })

  it('starts only the first queued customer and locks the next one', () => {
    const first = item({ queue_number: 1, customer_name: 'First' })
    const second = item({ queue_number: 2, customer_name: 'Second', queue_order_at: '2026-07-31T08:05:00.000Z' })
    const result = mutatePlaygroundQueue([first, second], 'start', first.queue_entry_id)

    expect(result.items.find((row) => row.queue_entry_id === first.queue_entry_id)?.status).toBe('in_service')
    expect(result.items.find((row) => row.queue_entry_id === second.queue_entry_id)?.is_next_locked).toBe(true)
    expect(result.notices).toHaveLength(2)
  })

  it('requeues an in-service customer at the end without changing the number', () => {
    const serving = item({ queue_number: 7, status: 'in_service', service_started_at: '2026-07-31T08:00:00.000Z' })
    const waiting = item({ queue_number: 8, queue_order_at: '2026-07-31T08:05:00.000Z', is_next_locked: true })
    const result = mutatePlaygroundQueue([serving, waiting], 'requeue', serving.queue_entry_id)
    const requeued = result.items.find((row) => row.queue_entry_id === serving.queue_entry_id)

    expect(requeued?.queue_number).toBe(7)
    expect(requeued?.status).toBe('queued')
    expect(requeued?.scheduled_priority_eligible).toBe(false)
    expect(requeued?.live_position).toBe(2)
  })

  it('stores new records only in sessionStorage and restores them on refresh', () => {
    const original = loadPlaygroundQueue()
    const added = addPlaygroundItem(original, {
      customerName: '  Demo Visitor  ', notes: '  Local note  ', sourceType: 'booking',
      service: { service_code: 'haircut', service_name: 'Haircut', duration_minutes: 60, sort_order: 1 },
    })

    expect(added.some((row) => row.customer_name === 'Demo Visitor')).toBe(true)
    expect(loadPlaygroundQueue().some((row) => row.customer_name === 'Demo Visitor')).toBe(true)
    expect(localStorage.length).toBe(0)
  })
})
