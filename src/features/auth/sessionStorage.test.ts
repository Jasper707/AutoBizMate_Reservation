import { describe, expect, it } from 'vitest'
import {
  authStorage,
  clearAllAuthStorage,
  setRememberSession,
} from './sessionStorage'

describe('Supabase-compatible auth storage', () => {
  it('uses local storage when remember me is checked', () => {
    setRememberSession(true)
    authStorage.setItem('sb-test-auth-token', 'persistent')

    expect(window.localStorage.getItem('sb-test-auth-token')).toBe('persistent')
    expect(window.sessionStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('uses session storage when remember me is unchecked', () => {
    setRememberSession(false)
    authStorage.setItem('sb-test-auth-token', 'session-only')

    expect(window.sessionStorage.getItem('sb-test-auth-token')).toBe('session-only')
    expect(window.localStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('clears Supabase session values from both stores on sign out', () => {
    window.localStorage.setItem('sb-one-auth-token', 'one')
    window.sessionStorage.setItem('sb-two-auth-token', 'two')

    clearAllAuthStorage()

    expect(window.localStorage.getItem('sb-one-auth-token')).toBeNull()
    expect(window.sessionStorage.getItem('sb-two-auth-token')).toBeNull()
  })
})
