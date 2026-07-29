import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  cancelQueueItem,
  completeQueueItem,
  getStaffQueueToday,
  startQueueItem,
} from './queueService'
import type { QueueItem, QueueMutation, QueueSource } from './queueModels'

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
      sourceType: QueueSource,
      sourceId: string,
    ) => {
      const key = `${mutation}:${sourceType}:${sourceId}`
      setPendingKey(key)
      try {
        if (mutation === 'start') await startQueueItem(sourceType, sourceId)
        if (mutation === 'complete') await completeQueueItem(sourceType, sourceId)
        if (mutation === 'cancel') await cancelQueueItem(sourceType, sourceId)
        await loadQueue(true)
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
