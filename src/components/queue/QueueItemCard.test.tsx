import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { QueueItem } from '../../features/queue/queueModels'
import { QueueItemCard } from './QueueItemCard'

function queueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    source_type: 'waiting_list',
    source_id: '42',
    reference_id: 'WL-TEST-42',
    company: 'codex_v2_test',
    employee_code: 'EMP-001',
    customer_name: 'Test Customer',
    service_code: 'haircut',
    service_name: 'Haircut',
    queue_date: '2026-07-29',
    scheduled_date: null,
    scheduled_start_time: null,
    joined_at: '2026-07-29T09:00:00+08:00',
    arrived_at: '2026-07-29T09:05:00+08:00',
    service_started_at: null,
    status: 'confirmed',
    notes: null,
    arrival_verification_source: 'chatbot_daily_question',
    queue_position: 1,
    priority_group: 3,
    priority_time: '2026-07-29T09:05:00+08:00',
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
      source_id: '84',
      reference_id: 'BK-TEST-84',
      scheduled_date: '2026-07-29',
      scheduled_start_time: '14:30:00',
      notes: 'Customer requested a quiet appointment.',
    }))

    expect(screen.getAllByText('Scheduled')).toHaveLength(2)
    expect(
      screen.getByText('Customer requested a quiet appointment.'),
    ).toBeInTheDocument()
  })
})
