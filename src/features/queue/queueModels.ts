export type QueueSource = 'booking' | 'waiting_list'
export type QueueStatus = 'confirmed' | 'in_service'

export type QueueItem = {
  source_type: QueueSource
  source_id: string
  reference_id: string
  company: string
  employee_code: string
  customer_name: string
  service_code: string | null
  service_name: string | null
  queue_date: string | null
  scheduled_date: string | null
  scheduled_start_time: string | null
  joined_at: string | null
  arrived_at: string | null
  service_started_at: string | null
  status: QueueStatus
  notes: string | null
  arrival_verification_source: string | null
  queue_position: number | null
  priority_group: number
  priority_time: string | null
}

export type QueueMutation = 'start' | 'complete' | 'cancel'
