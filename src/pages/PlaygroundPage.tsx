import { FlaskConical, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useToast } from '../app/providers/providerContexts'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { QueueItemCard } from '../components/queue/QueueItemCard'
import {
  addPlaygroundItem,
  getPlaygroundServices,
  loadPlaygroundQueue,
  mutatePlaygroundQueue,
  resetPlaygroundQueue,
  type PlaygroundService,
} from '../features/queue/playgroundQueueAdapter'
import type { QueueItem, QueueMutation, QueueSource } from '../features/queue/queueModels'

type ActionDialog = { mutation: QueueMutation; item: QueueItem } | null

export function PlaygroundPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<QueueItem[]>(() => loadPlaygroundQueue())
  const [services, setServices] = useState<PlaygroundService[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [customerName, setCustomerName] = useState('')
  const [serviceCode, setServiceCode] = useState('')
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState<QueueSource | ''>('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    void getPlaygroundServices().then(setServices)
  }, [])

  const inService = useMemo(() => items.filter((item) => item.status === 'in_service'), [items])
  const waiting = useMemo(() => items.filter((item) => item.status === 'queued'), [items])

  const resetForm = () => {
    setCustomerName('')
    setServiceCode('')
    setNotes('')
    setSourceType('')
    setFormError('')
  }

  const addRecord = (event: FormEvent) => {
    event.preventDefault()
    const selectedService = services.find((service) => service.service_code === serviceCode)
    if (!customerName.trim() || !selectedService || !sourceType) {
      setFormError('Customer name, service, and booking source are required.')
      return
    }
    setItems(addPlaygroundItem(items, {
      customerName,
      service: selectedService,
      notes,
      sourceType,
    }))
    setAddOpen(false)
    resetForm()
    showToast('Demo record added to this browser tab only.')
  }

  const confirmAction = () => {
    if (!dialog) return
    const result = mutatePlaygroundQueue(items, dialog.mutation, dialog.item.queue_entry_id)
    setItems(result.items)
    result.notices.forEach((notice) => showToast(`${notice.title}: ${notice.message}`))
    setDialog(null)
  }

  const actionCopy = (() => {
    if (!dialog) return null
    if (dialog.mutation === 'complete') return {
      title: 'Mark this demo service as complete?',
      body: <p><strong>{dialog.item.customer_name}</strong> will leave the active demo queue.</p>,
      confirm: 'Complete Service', cancel: 'Keep Open', tone: 'primary' as const,
    }
    if (dialog.mutation === 'requeue') return {
      title: 'Return this demo customer to the queue?',
      body: <p>The original queue number stays the same, while the live position moves to the end.</p>,
      confirm: 'Return to Queue', cancel: 'Keep Servicing', tone: 'danger' as const,
    }
    if (dialog.mutation === 'cancel') return {
      title: 'Cancel this demo queue entry?',
      body: <p>The record is removed from the active demo stack without writing to production.</p>,
      confirm: 'Cancel Entry', cancel: 'Keep Entry', tone: 'danger' as const,
    }
    return {
      title: inService.length ? 'Start another demo service?' : `Start servicing ${dialog.item.customer_name}?`,
      body: inService.length
        ? <p>You are currently servicing another customer. Are you sure you want to start servicing this customer as well?</p>
        : <p>Start <strong>{dialog.item.service_name}</strong> for {dialog.item.customer_name} now?</p>,
      confirm: inService.length ? 'Start Another Service' : 'Start Service', cancel: 'Cancel', tone: 'primary' as const,
    }
  })()

  return (
    <main className="playground-page">
      <section className="playground-hero">
        <div>
          <span className="eyebrow"><FlaskConical size={15} aria-hidden="true" /> Interactive demo</span>
          <h1>Staff Queue Playground</h1>
          <p>Try the live queue rules safely. Everything you add stays in this browser tab and never reaches Supabase, n8n, Redis, or Telegram.</p>
        </div>
        <div className="playground-actions">
          <button className="button button--primary" type="button" onClick={() => setAddOpen(true)}>
            <Plus size={17} aria-hidden="true" /> Add a record
          </button>
          <button className="button button--secondary" type="button" onClick={() => {
            setItems(resetPlaygroundQueue())
            showToast('Playground examples restored.')
          }}>
            <RotateCcw size={17} aria-hidden="true" /> Reset Playground
          </button>
        </div>
      </section>

      <section className="playground-safety" aria-label="Playground storage notice">
        <strong>Local simulation</strong>
        <span>Refresh preserves this tab’s session. Closing the tab or browser session clears it.</span>
      </section>

      <section className="queue-summary" aria-label="Demo queue summary">
        <div><span>{inService.length}</span><small>In service</small></div>
        <div><span>{waiting.filter((item) => item.is_next_locked).length}</span><small>Locked next</small></div>
        <div><span>{waiting.filter((item) => item.priority_group === 3).length}</span><small>Scheduled now</small></div>
        <div><span>{waiting.length}</span><small>Waiting</small></div>
      </section>

      <div className="queue-content">
        {inService.length > 0 ? (
          <section className="queue-section" aria-labelledby="demo-active-title">
            <div className="queue-section__heading"><div><span className="eyebrow">Active work</span><h2 id="demo-active-title">Currently serving</h2></div><span className="queue-count">{inService.length}</span></div>
            <div className="queue-stack">
              {inService.map((item, index) => <QueueItemCard key={item.queue_entry_id} item={item} visualPosition={index + 1} pendingKey="" onAction={(mutation, selected) => setDialog({ mutation, item: selected })} />)}
            </div>
          </section>
        ) : null}
        <section className="queue-section" aria-labelledby="demo-waiting-title">
          <div className="queue-section__heading"><div><span className="eyebrow">Ready to serve</span><h2 id="demo-waiting-title">Arrived queue</h2></div><span className="queue-count">{waiting.length}</span></div>
          <div className="queue-stack">
            {waiting.map((item, index) => <QueueItemCard key={item.queue_entry_id} item={item} visualPosition={index + 1} pendingKey="" canStart={index === 0} startDisabledReason={index === 0 ? undefined : 'Another customer is currently locked or ordered ahead.'} onAction={(mutation, selected) => setDialog({ mutation, item: selected })} />)}
          </div>
        </section>
      </div>

      {addOpen ? (
        <div className="playground-modal" role="presentation">
          <form className="playground-modal__card" role="dialog" aria-modal="true" aria-labelledby="add-record-title" onSubmit={addRecord} noValidate>
            <button className="icon-button playground-modal__close" type="button" aria-label="Close add record" onClick={() => { setAddOpen(false); resetForm() }}><X /></button>
            <span className="eyebrow">Local record</span>
            <h2 id="add-record-title">Add a record</h2>
            <label>This customer arrived:<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required /></label>
            <label>He/she chose this service:<select value={serviceCode} onChange={(event) => setServiceCode(event.target.value)} required><option value="">Select a service</option>{services.map((service) => <option key={service.service_code} value={service.service_code}>{service.service_name}</option>)}</select></label>
            <label>He/she added this note:<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label>
            <fieldset><legend>He/she booked through:</legend><div className="segmented-control"><button type="button" aria-pressed={sourceType === 'booking'} onClick={() => setSourceType('booking')}>Schedule</button><button type="button" aria-pressed={sourceType === 'waiting_list'} onClick={() => setSourceType('waiting_list')}>Waiting List</button></div></fieldset>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <div className="playground-modal__actions"><button className="button button--quiet" type="button" onClick={() => { setAddOpen(false); resetForm() }}>Cancel</button><button className="button button--primary" type="submit">Add</button></div>
          </form>
        </div>
      ) : null}

      {dialog && actionCopy ? <ConfirmDialog open title={actionCopy.title} confirmLabel={actionCopy.confirm} cancelLabel={actionCopy.cancel} tone={actionCopy.tone} pending={false} onConfirm={confirmAction} onCancel={() => setDialog(null)}>{actionCopy.body}</ConfirmDialog> : null}
    </main>
  )
}
