import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  cancelQueuedItem,
  completeQueueItem,
  getStaffQueueToday,
  requeueInServiceItem,
  startQueueItem,
} from './queueService'
import type { QueueItem, QueueMutation, QueueMutationResult } from './queueModels'

export function useStaffQueue(company: string | undefined) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [pendingKey, setPendingKey] = useState('')
  const debounceTimer = useRef<number | undefined>(undefined)

  const loadQueue = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const queue = await getStaffQueueToday()
      setItems(queue)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load the queue. Try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQueue()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadQueue])

  useEffect(() => {
    const client = supabase
    if (!client || !company) return

    const scheduleRefresh = () => {
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = window.setTimeout(() => {
        void loadQueue(true)
      }, 280)
    }

    const channel = client
      .channel(`staff-queue-${company}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter: `company=eq.${company}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking', filter: `company=eq.${company}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waiting_list', filter: `company=eq.${company}` },
        scheduleRefresh,
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    return () => {
      window.clearTimeout(debounceTimer.current)
      setRealtimeConnected(false)
      void client.removeChannel(channel)
    }
  }, [company, loadQueue])

  const mutate = useCallback(
    async (
      mutation: QueueMutation,
      queueEntryId: string,
    ) => {
      const key = `${mutation}:${queueEntryId}`
      setPendingKey(key)
      try {
        let result: QueueMutationResult | undefined
        if (mutation === 'start') result = await startQueueItem(queueEntryId)
        if (mutation === 'complete') result = await completeQueueItem(queueEntryId)
        if (mutation === 'requeue') result = await requeueInServiceItem(queueEntryId)
        if (mutation === 'cancel') result = await cancelQueuedItem(queueEntryId)
        await loadQueue(true)
        return result
      } finally {
        setPendingKey('')
      }
    },
    [loadQueue],
  )

  const refresh = useCallback(() => loadQueue(true), [loadQueue])

  return {
    items,
    loading,
    refreshing,
    error,
    realtimeConnected,
    pendingKey,
    refresh,
    mutate,
  }
}
