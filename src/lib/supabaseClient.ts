import { createClient } from '@supabase/supabase-js'
import { authStorage } from '../features/auth/sessionStorage'

type RuntimeConfig = {
  supabaseUrl?: string
  supabasePublishableKey?: string
}

const runtimeConfig = (
  globalThis as typeof globalThis & {
    __AUTOBIZMATE_CONFIG__?: RuntimeConfig
  }
).__AUTOBIZMATE_CONFIG__

const supabaseUrl = (
  runtimeConfig?.supabaseUrl ?? import.meta.env.VITE_SUPABASE_URL
)?.trim()
const supabasePublishableKey = (
  runtimeConfig?.supabasePublishableKey
  ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const supabaseConfigurationMessage =
  'Staff access is not configured for this deployment yet. Add the Supabase browser environment values to enable sign in.'
