import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type {
  signInStaff,
  StaffContext,
} from '../../features/auth/authService'

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authorized'
  | 'unauthorized'

export type AuthContextValue = {
  status: AuthStatus
  session: Session | null
  staff: StaffContext | null
  signIn: typeof signInStaff
  signOut: () => Promise<void>
}

export type Theme = 'light' | 'dark'

export type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
}

export type ToastTone = 'success' | 'error'

export type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
export const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
