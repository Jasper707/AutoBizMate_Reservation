import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { QueueItem } from '../../features/queue/queueModels'
import { QueueItemCard } from './QueueItemCard'

function queueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    queue_entry_id: '00000000-0000-4000-a000-000000000042',
    queue_number: 7,
    source_type: 'waiting_list',
    source_reference: 'WL-TEST-42',
    customer_name: 'Test Customer',
    customer_chat_id: null,
    service_code: 'haircut',
    service_name: 'Haircut',
    scheduled_start_time: null,
    scheduled_end_time: null,
    scheduled_priority_eligible: false,
    arrived_at: '2026-07-29T09:05:00+08:00',
    queue_order_at: '2026-07-29T09:05:00+08:00',
    requeued_at: null,
    service_started_at: null,
    status: 'queued',
    notes: null,
    is_next_locked: false,
    priority_group: 4,
    live_position: 1,
    ...overrides,
  }
}

function renderCard(item: QueueItem) {
  render(
    <QueueItemCard
      item={item}
      visualPosition={1}
      pendingKey=""
      onAction={vi.fn()}
    />,
  )
}

describe('QueueItemCard customer notes', () => {
  it('renders a safely escaped customer note when present', () => {
    renderCard(queueItem({ notes: '<script>alert("x")</script> Please use cool water.' }))

    expect(screen.getByText('Customer note')).toBeInTheDocument()
    expect(
      screen.getByText('<script>alert("x")</script> Please use cool water.'),
    ).toBeInTheDocument()
    expect(document.querySelector('script')).not.toBeInTheDocument()
  })

  it('does not render an empty note section', () => {
    renderCard(queueItem({ notes: '   ' }))

    expect(screen.queryByText('Customer note')).not.toBeInTheDocument()
  })

  it('preserves a long note as text for CSS wrapping', () => {
    const note = `Please avoid this product: ${'verylongword'.repeat(45)}`
    renderCard(queueItem({ notes: note }))

    const noteRegion = screen.getByRole('region', { name: 'Customer note' })
    expect(noteRegion).toHaveTextContent(note)
    expect(noteRegion.querySelector('p')).toBeInTheDocument()
  })

  it('supports refreshed booking rows with notes', () => {
    renderCard(queueItem({
      source_type: 'booking',
      source_reference: 'BK-TEST-84',
      scheduled_start_time: '14:30:00',
      scheduled_end_time: '15:30:00',
      scheduled_priority_eligible: true,
      notes: 'Customer requested a quiet appointment.',
    }))

    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByText('Scheduled window')).toBeInTheDocument()
    expect(
      screen.getByText('Customer requested a quiet appointment.'),
    ).toBeInTheDocument()
  })

  it('shows the locked-next state and disables lower-priority Doing', () => {
    render(
      <QueueItemCard
        item={queueItem({ is_next_locked: true, priority_group: 2 })}
        visualPosition={1}
        pendingKey=""
        canStart={false}
        startDisabledReason="Another customer is currently locked or ordered ahead."
        onAction={vi.fn()}
      />,
    )

    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start service/i })).toBeDisabled()
  })
})
