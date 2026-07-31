import { CalendarDays, CircleAlert, Inbox, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth, useToast } from '../app/providers/providerContexts'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingState } from '../components/common/LoadingState'
import type { StaffOutletContext } from '../components/layout/ProtectedStaffLayout'
import { QueueItemCard } from '../components/queue/QueueItemCard'
import type { QueueItem, QueueMutation } from '../features/queue/queueModels'
import { useStaffQueue } from '../features/queue/useStaffQueue'

function getGreeting(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date()),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatLocalDate(timezone: string) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date())
}

type DialogState = {
  mutation: QueueMutation
  item: QueueItem
} | null

export function StaffPage() {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const { setRefreshHandler, setRealtimeConnected } =
    useOutletContext<StaffOutletContext>()
  const {
    items,
    loading,
    refreshing,
    error,
    realtimeConnected,
    pendingKey,
    refresh,
    mutate,
  } = useStaffQueue(staff?.company)
  const [dialog, setDialog] = useState<DialogState>(null)

  useEffect(() => {
    setRefreshHandler(refresh)
    return () => setRefreshHandler(null)
  }, [refresh, setRefreshHandler])

  useEffect(() => {
    setRealtimeConnected(realtimeConnected)
  }, [realtimeConnected, setRealtimeConnected])

  const inService = useMemo(
    () => items.filter((item) => item.status === 'in_service'),
    [items],
  )
  const waiting = useMemo(
    () => items.filter((item) => item.status !== 'in_service'),
    [items],
  )

  const handleConfirm = async () => {
    if (!dialog) return
    try {
      const result = await mutate(dialog.mutation, dialog.item.queue_entry_id)
      const message = {
        start: `Service started for ${dialog.item.customer_name}.`,
        complete: `Service completed for ${dialog.item.customer_name}.`,
        requeue: `${dialog.item.customer_name} was returned to the end of the queue.`,
        cancel: `${dialog.item.customer_name} was removed from the active queue.`,
      }[dialog.mutation]
      showToast(message)
      if (
        result?.serviceNotificationStatus === 'not_available' ||
        result?.nextNotification?.notificationStatus === 'not_available'
      ) {
        showToast('Queue updated. A Telegram notice was unavailable for one customer.')
      }
      setDialog(null)
    } catch (mutationError) {
      showToast(
        mutationError instanceof Error
          ? mutationError.message
          : 'The queue item could not be updated.',
        'error',
      )
    }
  }

  const dialogPending = Boolean(
    dialog && pendingKey === `${dialog.mutation}:${dialog.item.queue_entry_id}`,
  )

  const dialogCopy = (() => {
    if (!dialog) return null
    if (dialog.mutation === 'complete') {
      return {
        title: 'Mark this service as complete?',
        body: (
          <p>
            <strong>Customer:</strong> {dialog.item.customer_name}
            <br />
            <strong>Service:</strong> {dialog.item.service_name ?? 'Not specified'}
          </p>
        ),
        confirm: 'Complete Service',
        cancel: 'Keep Open',
        tone: 'primary' as const,
      }
    }
    if (dialog.mutation === 'requeue') {
      return {
        title: 'Return this customer to the queue?',
        body: (
          <p>
            Stop servicing <strong>{dialog.item.customer_name}</strong> and return them
            to the end of the queue?
            <br /><br />
            Their original queue number will remain the same, but their live position
            will move to the end.
          </p>
        ),
        confirm: 'Return to Queue',
        cancel: 'Keep Servicing',
        tone: 'danger' as const,
      }
    }
    if (dialog.mutation === 'cancel') {
      return {
        title: 'Cancel this queue entry?',
        body: (
          <p>
            This removes <strong>{dialog.item.customer_name}</strong> from the active
            queue but keeps the record for reporting and history.
          </p>
        ),
        confirm: 'Cancel Entry',
        cancel: 'Keep Entry',
        tone: 'danger' as const,
      }
    }

    return {
      title:
        inService.length > 0
          ? 'Start another service?'
          : `Start servicing ${dialog.item.customer_name}?`,
      body:
        inService.length > 0 ? (
          <>
            <p>
              You are currently servicing another customer. Are you sure you want to
              start this customer as well?
            </p>
            <div className="dialog-current-list">
              <strong>Currently servicing:</strong>
              <ul>
                {inService.map((item) => (
                  <li key={item.queue_entry_id}>
                    {item.customer_name} — {item.service_name ?? 'Service'}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p>
            Start <strong>{dialog.item.service_name ?? 'the service'}</strong> for{' '}
            {dialog.item.customer_name} now?
          </p>
        ),
      confirm: inService.length > 0 ? 'Start Another Service' : 'Start Service',
      cancel: 'Cancel',
      tone: 'primary' as const,
    }
  })()

  const firstName = staff?.displayName.split(/\s+/)[0] ?? 'there'
  const timezone = staff?.timezone ?? 'Asia/Manila'

  return (
    <main className="staff-page">
      <section className="staff-welcome">
        <div>
          <span className="eyebrow">{staff?.companyName ?? 'Your business'}</span>
          <h1>
            {getGreeting(timezone)}, {firstName}
          </h1>
          <p>Here is your queue for today.</p>
        </div>
        <div className="staff-date">
          <CalendarDays aria-hidden="true" size={20} />
          <span>{formatLocalDate(timezone)}</span>
        </div>
      </section>

      <section className="queue-summary" aria-label="Queue summary">
        <div>
          <span>{inService.length}</span>
          <small>In service</small>
        </div>
        <div>
          <span>{waiting.filter((item) => item.source_type === 'booking').length}</span>
          <small>Scheduled arrivals</small>
        </div>
        <div>
          <span>{waiting.filter((item) => item.source_type === 'waiting_list').length}</span>
          <small>Waiting list</small>
        </div>
        <div className="queue-summary__rule">
          <span>0 / 0 min</span>
          <small>Before / after schedule</small>
        </div>
      </section>

      {loading ? (
        <LoadingState title="Loading today’s queue" message="Checking arrived customers and active services." />
      ) : error ? (
        <section className="queue-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <div>
            <h2>Could not load the queue</h2>
            <p>{error}</p>
          </div>
          <button className="button button--secondary" type="button" onClick={refresh}>
            <RefreshCw aria-hidden="true" size={17} />
            Try again
          </button>
        </section>
      ) : items.length === 0 ? (
        <section className="queue-empty">
          <span className="queue-empty__icon">
            <Inbox aria-hidden="true" />
          </span>
          <h2>Your active queue is clear.</h2>
          <p>Arrived customers and active services will appear here.</p>
          <button className="button button--secondary" type="button" onClick={refresh}>
            <RefreshCw aria-hidden="true" size={17} />
            Refresh queue
          </button>
        </section>
      ) : (
        <div className={`queue-content${refreshing ? ' queue-content--refreshing' : ''}`}>
          {inService.length > 0 && (
            <section className="queue-section" aria-labelledby="in-service-title">
              <div className="queue-section__heading">
                <div>
                  <span className="eyebrow">Active work</span>
                  <h2 id="in-service-title">Currently serving</h2>
                </div>
                <span className="queue-count">{inService.length}</span>
              </div>
              <div className="queue-stack">
                {inService.map((item, index) => (
                  <QueueItemCard
                    key={item.queue_entry_id}
                    item={item}
                    visualPosition={index + 1}
                    pendingKey={pendingKey}
                    onAction={(mutation, selectedItem) =>
                      setDialog({ mutation, item: selectedItem })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {waiting.length > 0 && (
            <section className="queue-section" aria-labelledby="waiting-title">
              <div className="queue-section__heading">
                <div>
                  <span className="eyebrow">Ready to serve</span>
                  <h2 id="waiting-title">Arrived queue</h2>
                </div>
                <span className="queue-count">{waiting.length}</span>
              </div>
              <div className="queue-stack">
                {waiting.map((item, index) => (
                  <QueueItemCard
                    key={item.queue_entry_id}
                    item={item}
                    visualPosition={index + 1}
                    pendingKey={pendingKey}
                    canStart={index === 0}
                    startDisabledReason={index === 0 ? undefined : 'Another customer is currently locked or ordered ahead.'}
                    onAction={(mutation, selectedItem) =>
                      setDialog({ mutation, item: selectedItem })
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {dialog && dialogCopy && (
        <ConfirmDialog
          open
          title={dialogCopy.title}
          confirmLabel={dialogCopy.confirm}
          cancelLabel={dialogCopy.cancel}
          tone={dialogCopy.tone}
          pending={dialogPending}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setDialog(null)}
        >
          {dialogCopy.body}
        </ConfirmDialog>
      )}
    </main>
  )
}
