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
  cancelQueueItem: vi.fn(),
}))

import { useStaffQueue } from './useStaffQueue'

const queueRows: QueueItem[] = [
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
    notes: 'Please call my name quietly.',
    arrival_verification_source: 'chatbot_daily_question',
    queue_position: 1,
    priority_group: 3,
    priority_time: '2026-07-29T10:05:00+08:00',
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
})
