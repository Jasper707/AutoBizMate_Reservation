const REMEMBER_KEY = 'autobizmate-remember-session'
const CONTEXT_KEY = 'autobizmate-staff-context'

function getBrowserStorage(persistent: boolean): Storage | null {
  if (typeof window === 'undefined') return null
  return persistent ? window.localStorage : window.sessionStorage
}

export function shouldRememberSession() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(REMEMBER_KEY) === 'true'
}

export function setRememberSession(remember: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REMEMBER_KEY, String(remember))
}

export const authStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    const persistent = shouldRememberSession()
    const target = getBrowserStorage(persistent)
    const other = getBrowserStorage(!persistent)
    other?.removeItem(key)
    target?.setItem(key, value)
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export function saveStaffContext(context: unknown) {
  const persistent = shouldRememberSession()
  const target = getBrowserStorage(persistent)
  const other = getBrowserStorage(!persistent)
  other?.removeItem(CONTEXT_KEY)
  target?.setItem(CONTEXT_KEY, JSON.stringify(context))
}

export function readStaffContext<T>() {
  if (typeof window === 'undefined') return null
  const raw =
    window.localStorage.getItem(CONTEXT_KEY) ?? window.sessionStorage.getItem(CONTEXT_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    clearStaffContext()
    return null
  }
}

export function clearStaffContext() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CONTEXT_KEY)
  window.sessionStorage.removeItem(CONTEXT_KEY)
}

export function clearAllAuthStorage() {
  if (typeof window === 'undefined') return

  for (const storage of [window.localStorage, window.sessionStorage]) {
    Object.keys(storage)
      .filter((key) => key.startsWith('sb-') || key === CONTEXT_KEY)
      .forEach((key) => storage.removeItem(key))
  }
}
