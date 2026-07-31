import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueueItem } from './queueModels'

const callbacks = vi.hoisted(
  () => new Map<string, () => void>(),
)
const getStaffQueueToday = vi.hoisted(() => vi.fn())
const removeChannel = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabaseClient', () => {
  const channel = {
    on: vi.fn((
      _event: string,
      config: { table: string },
      callback: () => void,
    ) => {
      callbacks.set(config.table, callback)
      return channel
    }),
    subscribe: vi.fn((callback: (status: string) => void) => {
      callback('SUBSCRIBED')
      return channel
    }),
  }
  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel,
    },
  }
})

vi.mock('./queueService', () => ({
  getStaffQueueToday,
  startQueueItem: vi.fn(),
  completeQueueItem: vi.fn(),
  requeueInServiceItem: vi.fn(),
  cancelQueuedItem: vi.fn(),
}))

import { useStaffQueue } from './useStaffQueue'

const queueRows: QueueItem[] = [
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
    notes: 'Please call my name quietly.',
    is_next_locked: false,
    priority_group: 4,
    live_position: 1,
  },
]

async function advance(milliseconds: number) {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds)
    await Promise.resolve()
  })
}

describe('useStaffQueue Realtime refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    callbacks.clear()
    getStaffQueueToday.mockReset()
    getStaffQueueToday.mockResolvedValue(queueRows)
    removeChannel.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refreshes note-bearing rows after booking and waiting-list events', async () => {
    const { result, unmount } = renderHook(() =>
      useStaffQueue('sample_company'),
    )

    await advance(0)
    expect(getStaffQueueToday).toHaveBeenCalledTimes(1)
    expect(result.current.items[0].notes).toBe('Please call my name quietly.')

    act(() => callbacks.get('booking')?.())
    await advance(280)
    expect(getStaffQueueToday).toHaveBeenCalledTimes(2)

    act(() => callbacks.get('waiting_list')?.())
    await advance(280)
    expect(getStaffQueueToday).toHaveBeenCalledTimes(3)

    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(1)
  })

  it('refreshes after canonical queue-entry events', async () => {
    const { unmount } = renderHook(() => useStaffQueue('sample_company'))
    await advance(0)
    act(() => callbacks.get('queue_entries')?.())
    await advance(280)
    expect(getStaffQueueToday).toHaveBeenCalledTimes(2)
    unmount()
  })
})
