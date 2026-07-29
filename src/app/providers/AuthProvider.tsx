import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import {
  restoreStaffContext,
  signInStaff,
  signOutStaff,
  type StaffContext,
} from '../../features/auth/authService'
import { readStaffContext } from '../../features/auth/sessionStorage'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './providerContexts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    supabase ? 'loading' : 'unauthenticated',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [staff, setStaff] = useState<StaffContext | null>(() =>
    readStaffContext<StaffContext>(),
  )

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession?.user) {
      setStaff(null)
      setStatus('unauthenticated')
      return
    }

    const restored = await restoreStaffContext(nextSession.user)
    if (restored) {
      setStaff(restored)
      setStatus('authorized')
    } else {
      setStaff(null)
      setStatus('unauthorized')
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) void resolveSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void resolveSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [resolveSession])

  const signIn = useCallback<AuthContextValue['signIn']>(async (input) => {
    const nextStaff = await signInStaff(input)
    setStaff(nextStaff)
    setStatus('authorized')
    return nextStaff
  }, [])

  const signOut = useCallback(async () => {
    await signOutStaff()
    setStaff(null)
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo(
    () => ({ status, session, staff, signIn, signOut }),
    [session, signIn, signOut, staff, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
