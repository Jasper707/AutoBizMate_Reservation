export type QueueSource = 'booking' | 'waiting_list'
export type QueueStatus = 'queued' | 'in_service' | 'completed' | 'cancelled'

export type QueueItem = {
  queue_entry_id: string
  queue_number: number
  source_type: QueueSource
  source_reference: string
  customer_name: string
  customer_chat_id: string | null
  service_code: string | null
  service_name: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  scheduled_priority_eligible: boolean
  arrived_at: string | null
  queue_order_at: string | null
  requeued_at: string | null
  service_started_at: string | null
  status: QueueStatus
  notes: string | null
  is_next_locked: boolean
  priority_group: number
  live_position: number
}

export type QueueMutation = 'start' | 'complete' | 'requeue' | 'cancel'

export type QueueMutationResult = {
  success: boolean
  action: string
  serviceNotificationStatus?: string | null
  nextNotification?: {
    notificationStatus?: string | null
  } | null
  queue?: QueueItem[]
}
