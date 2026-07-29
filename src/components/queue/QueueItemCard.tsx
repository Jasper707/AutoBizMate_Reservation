import { CalendarClock, Check, Clock3, Play, X } from 'lucide-react'
import type { QueueItem, QueueMutation } from '../../features/queue/queueModels'

function formatTime(value: string | null) {
  if (!value) return 'Time not recorded'
  const match = value.match(/^(\d{2}):(\d{2})/)
  if (match) {
    const date = new Date()
    date.setHours(Number(match[1]), Number(match[2]), 0, 0)
    return new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function QueueItemCard({
  item,
  visualPosition,
  pendingKey,
  onAction,
}: {
  item: QueueItem
  visualPosition: number
  pendingKey: string
  onAction: (mutation: QueueMutation, item: QueueItem) => void
}) {
  const inService = item.status === 'in_service'
  const sourceLabel = item.source_type === 'booking' ? 'Scheduled' : 'Waiting List'
  const detailTime =
    item.source_type === 'booking'
      ? formatTime(item.scheduled_start_time)
      : formatTime(item.arrived_at ?? item.joined_at)
  const itemPending = pendingKey.endsWith(`${item.source_type}:${item.source_id}`)
  const customerNote = item.notes?.trim()

  return (
    <article className={`queue-card${inService ? ' queue-card--active' : ''}`}>
      <div className="queue-card__position">
        <span>{inService ? 'NOW' : String(visualPosition).padStart(2, '0')}</span>
        <small>{inService ? 'Serving' : 'Queue'}</small>
      </div>
      <div className="queue-card__identity">
        <div className="queue-card__badges">
          <span className={`badge ${inService ? 'badge--active' : ''}`}>
            {inService ? 'In Service' : 'Ready'}
          </span>
          <span className="badge badge--neutral">{sourceLabel}</span>
        </div>
        <h3>{item.customer_name}</h3>
        <p>{item.service_name ?? 'Service details not specified'}</p>
        {customerNote ? (
          <section className="queue-card__note" aria-label="Customer note">
            <small>Customer note</small>
            <p>{customerNote}</p>
          </section>
        ) : null}
      </div>
      <div className="queue-card__details">
        {item.source_type === 'booking' ? (
          <CalendarClock aria-hidden="true" size={18} />
        ) : (
          <Clock3 aria-hidden="true" size={18} />
        )}
        <span>
          <small>{item.source_type === 'booking' ? 'Scheduled' : 'Arrived'}</small>
          <strong>{detailTime}</strong>
        </span>
      </div>
      <div className="queue-card__actions">
        {inService ? (
          <button
            className="button button--success button--compact"
            type="button"
            onClick={() => onAction('complete', item)}
            disabled={itemPending}
          >
            <Check aria-hidden="true" size={17} />
            Complete
          </button>
        ) : (
          <button
            className="button button--primary button--compact"
            type="button"
            onClick={() => onAction('start', item)}
            disabled={itemPending}
            aria-label={`Start service for ${item.customer_name}`}
          >
            <Play aria-hidden="true" size={16} />
            Doing
          </button>
        )}
        <button
          className="button button--quiet button--compact"
          type="button"
          onClick={() => onAction('cancel', item)}
          disabled={itemPending}
          aria-label={`Cancel queue entry for ${item.customer_name}`}
        >
          <X aria-hidden="true" size={17} />
          Cancel
        </button>
      </div>
    </article>
  )
}
