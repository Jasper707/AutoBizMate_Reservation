import { supabase } from '../../lib/supabaseClient'
import type { QueueItem, QueueMutation, QueueSource } from './queueModels'

export type PlaygroundService = {
  service_code: string
  service_name: string
  duration_minutes: number
  sort_order: number
}

export type PlaygroundNotice = {
  title: string
  message: string
}

export type PlaygroundAddInput = {
  customerName: string
  service: PlaygroundService
  notes: string
  sourceType: QueueSource
}

const STORAGE_KEY = 'autobizmate.playground.queue.v1'

const fallbackServices: PlaygroundService[] = [
  { service_code: 'haircut', service_name: 'Haircut', duration_minutes: 60, sort_order: 1 },
  { service_code: 'hair_color', service_name: 'Hair Color', duration_minutes: 120, sort_order: 2 },
  { service_code: 'manicure', service_name: 'Manicure', duration_minutes: 60, sort_order: 3 },
]

function isoOffset(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function timeOffset(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toTimeString().slice(0, 8)
}

function exampleItems(): QueueItem[] {
  const now = new Date().toISOString()
  return [
    {
      queue_entry_id: crypto.randomUUID(), queue_number: 1,
      source_type: 'waiting_list', source_reference: 'DEMO-WL-001',
      customer_name: 'Mia Santos', customer_chat_id: null,
      service_code: 'haircut', service_name: 'Haircut', notes: 'Please use cool water.',
      scheduled_start_time: null, scheduled_end_time: null,
      scheduled_priority_eligible: false, arrived_at: isoOffset(-35),
      queue_order_at: isoOffset(-35), requeued_at: null, service_started_at: isoOffset(-8),
      status: 'in_service', is_next_locked: false, priority_group: 1, live_position: 1,
    },
    {
      queue_entry_id: crypto.randomUUID(), queue_number: 2,
      source_type: 'waiting_list', source_reference: 'DEMO-WL-002',
      customer_name: 'Noah Reyes', customer_chat_id: null,
      service_code: 'manicure', service_name: 'Manicure', notes: null,
      scheduled_start_time: null, scheduled_end_time: null,
      scheduled_priority_eligible: false, arrived_at: isoOffset(-25),
      queue_order_at: isoOffset(-25), requeued_at: null, service_started_at: null,
      status: 'queued', is_next_locked: true, priority_group: 2, live_position: 2,
    },
    {
      queue_entry_id: crypto.randomUUID(), queue_number: 3,
      source_type: 'booking', source_reference: 'DEMO-BK-003',
      customer_name: 'Ava Cruz', customer_chat_id: null,
      service_code: 'hair_color', service_name: 'Hair Color', notes: 'First visit.',
      scheduled_start_time: timeOffset(-10), scheduled_end_time: timeOffset(110),
      scheduled_priority_eligible: true, arrived_at: isoOffset(-15),
      queue_order_at: isoOffset(-15), requeued_at: null, service_started_at: null,
      status: 'queued', is_next_locked: false, priority_group: 3, live_position: 3,
    },
    {
      queue_entry_id: crypto.randomUUID(), queue_number: 4,
      source_type: 'waiting_list', source_reference: 'DEMO-WL-004',
      customer_name: 'Liam Garcia', customer_chat_id: null,
      service_code: 'haircut', service_name: 'Haircut', notes: null,
      scheduled_start_time: null, scheduled_end_time: null,
      scheduled_priority_eligible: false, arrived_at: now,
      queue_order_at: now, requeued_at: null, service_started_at: null,
      status: 'queued', is_next_locked: false, priority_group: 4, live_position: 4,
    },
  ]
}

function isScheduledNow(item: QueueItem, at: Date) {
  if (
    item.source_type !== 'booking' ||
    !item.scheduled_priority_eligible ||
    !item.scheduled_start_time ||
    !item.scheduled_end_time
  ) return false
  const current = at.toTimeString().slice(0, 8)
  return current >= item.scheduled_start_time && current <= item.scheduled_end_time
}

export function orderPlaygroundQueue(items: QueueItem[], at = new Date()) {
  const active = items.filter((item) => item.status === 'queued' || item.status === 'in_service')
  return active
    .map((item) => ({
      ...item,
      priority_group: item.status === 'in_service'
        ? 1
        : item.is_next_locked
          ? 2
          : isScheduledNow(item, at)
            ? 3
            : 4,
    }))
    .sort((left, right) => {
      if (left.priority_group !== right.priority_group) return left.priority_group - right.priority_group
      const leftOrder = left.priority_group === 1
        ? left.service_started_at
        : left.priority_group === 3
          ? left.scheduled_start_time
          : left.queue_order_at
      const rightOrder = right.priority_group === 1
        ? right.service_started_at
        : right.priority_group === 3
          ? right.scheduled_start_time
          : right.queue_order_at
      return String(leftOrder ?? '').localeCompare(String(rightOrder ?? '')) || left.queue_number - right.queue_number
    })
    .map((item, index) => ({ ...item, live_position: index + 1 }))
}

function lockNext(items: QueueItem[]) {
  const active = items.map((item) => item.status === 'queued' ? { ...item, is_next_locked: false } : item)
  const next = orderPlaygroundQueue(active).find((item) => item.status === 'queued')
  if (!next) return active
  return active.map((item) => item.queue_entry_id === next.queue_entry_id ? { ...item, is_next_locked: true } : item)
}

export function loadPlaygroundQueue() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return orderPlaygroundQueue(JSON.parse(raw) as QueueItem[])
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
  }
  const items = exampleItems()
  savePlaygroundQueue(items)
  return orderPlaygroundQueue(items)
}

export function savePlaygroundQueue(items: QueueItem[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function resetPlaygroundQueue() {
  const items = exampleItems()
  savePlaygroundQueue(items)
  return orderPlaygroundQueue(items)
}

export function addPlaygroundItem(items: QueueItem[], input: PlaygroundAddInput) {
  const now = new Date()
  const sourcePrefix = input.sourceType === 'booking' ? 'DEMO-BK' : 'DEMO-WL'
  const nextNumber = Math.max(0, ...items.map((item) => item.queue_number)) + 1
  const scheduledEnd = new Date(now.getTime() + input.service.duration_minutes * 60_000)
  const newItem: QueueItem = {
    queue_entry_id: crypto.randomUUID(), queue_number: nextNumber,
    source_type: input.sourceType,
    source_reference: `${sourcePrefix}-${String(nextNumber).padStart(3, '0')}`,
    customer_name: input.customerName.trim(), customer_chat_id: null,
    service_code: input.service.service_code, service_name: input.service.service_name,
    notes: input.notes.trim() || null,
    scheduled_start_time: input.sourceType === 'booking' ? now.toTimeString().slice(0, 8) : null,
    scheduled_end_time: input.sourceType === 'booking' ? scheduledEnd.toTimeString().slice(0, 8) : null,
    scheduled_priority_eligible: input.sourceType === 'booking',
    arrived_at: now.toISOString(), queue_order_at: now.toISOString(),
    requeued_at: null, service_started_at: null,
    status: 'queued', is_next_locked: false, priority_group: 4, live_position: 0,
  }
  const next = orderPlaygroundQueue([...items, newItem])
  savePlaygroundQueue(next)
  return next
}

export function mutatePlaygroundQueue(items: QueueItem[], mutation: QueueMutation, queueEntryId: string) {
  const now = new Date().toISOString()
  const current = orderPlaygroundQueue(items)
  const target = current.find((item) => item.queue_entry_id === queueEntryId)
  if (!target) return { items: current, notices: [] as PlaygroundNotice[] }
  const notices: PlaygroundNotice[] = []
  let next = items.map((item) => ({ ...item }))

  if (mutation === 'start') {
    const firstQueued = current.find((item) => item.status === 'queued')
    if (firstQueued?.queue_entry_id !== queueEntryId) return { items: current, notices }
    next = next.map((item) => item.queue_entry_id === queueEntryId
      ? { ...item, status: 'in_service', service_started_at: now, is_next_locked: false }
      : item)
    notices.push({ title: 'Demo customer notice', message: `${target.customer_name} is requested to proceed inside within 5 minutes.` })
    next = lockNext(next)
    const locked = next.find((item) => item.is_next_locked)
    if (locked) notices.push({ title: 'Demo next-in-line notice', message: `${locked.customer_name} is next and should remain near the shop.` })
  }
  if (mutation === 'complete') {
    next = next.map((item) => item.queue_entry_id === queueEntryId
      ? { ...item, status: 'completed', is_next_locked: false }
      : item)
  }
  if (mutation === 'requeue') {
    next = next.map((item) => item.queue_entry_id === queueEntryId
      ? {
          ...item, status: 'queued', service_started_at: null, requeued_at: now,
          queue_order_at: now, is_next_locked: false, scheduled_priority_eligible: false,
        }
      : item)
    if (!next.some((item) => item.status === 'queued' && item.is_next_locked)) next = lockNext(next)
  }
  if (mutation === 'cancel') {
    next = next.map((item) => item.queue_entry_id === queueEntryId
      ? { ...item, status: 'cancelled', is_next_locked: false }
      : item)
    next = lockNext(next)
  }

  const ordered = orderPlaygroundQueue(next)
  savePlaygroundQueue(next)
  return { items: ordered, notices }
}

export async function getPlaygroundServices(company = 'sample_company') {
  const client = supabase
  if (!client) return fallbackServices
  const { data, error } = await client.rpc('get_public_active_services', { p_company: company })
  if (error || !data?.length) return fallbackServices
  return (data as PlaygroundService[]).sort((a, b) => a.sort_order - b.sort_order || a.service_name.localeCompare(b.service_name))
}
