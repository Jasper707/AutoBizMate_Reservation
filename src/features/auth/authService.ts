import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import {
  clearAllAuthStorage,
  clearStaffContext,
  saveStaffContext,
  setRememberSession,
} from './sessionStorage'

export type StaffContext = {
  company: string
  companyName: string
  employeeCode: string
  displayName: string
  role: 'staff' | 'manager' | 'admin'
  timezone: string
}

const COMPANY_PATTERN = /^[a-z0-9_-]+$/
const GENERIC_AUTH_ERROR = 'We could not sign you in with those details.'

export function normalizeCompany(value: string) {
  return value.trim().toLowerCase()
}

export function isValidCompany(value: string) {
  return COMPANY_PATTERN.test(normalizeCompany(value))
}

function pickString(record: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

async function loadStaffContext(user: User, company: string): Promise<StaffContext> {
  if (!supabase) throw new Error(GENERIC_AUTH_ERROR)

  const { data: membership, error: membershipError } = await supabase
    .from('staff_accounts')
    .select('company, employee_code, role, is_active')
    .eq('auth_user_id', user.id)
    .eq('company', company)
    .eq('is_active', true)
    .maybeSingle()

  if (membershipError || !membership) throw new Error(GENERIC_AUTH_ERROR)

  const { data: employee, error: employeeError } = await supabase
    .from('employee')
    .select('*')
    .eq('company', company)
    .eq('employee_code', membership.employee_code)
    .maybeSingle()

  if (
    employeeError ||
    !employee ||
    employee.is_active === false ||
    employee.is_active === 0
  ) {
    throw new Error(GENERIC_AUTH_ERROR)
  }

  const employeeRecord = employee as Record<string, unknown>
  const context: StaffContext = {
    company,
    companyName: pickString(employeeRecord, ['company_name'], company),
    employeeCode: membership.employee_code,
    displayName: pickString(
      employeeRecord,
      ['display_name', 'employee_name', 'name', 'first_name'],
      'Staff member',
    ),
    role: membership.role as StaffContext['role'],
    timezone: pickString(employeeRecord, ['timezone'], 'Asia/Manila'),
  }

  const { data: companySettings } = await supabase
    .from('chatbot_company_settings')
    .select('*')
    .eq('company', company)
    .maybeSingle()

  if (companySettings) {
    const settings = companySettings as Record<string, unknown>
    context.companyName = pickString(settings, ['company_name', 'display_name', 'name'], context.companyName)
    context.timezone = pickString(settings, ['timezone', 'time_zone'], context.timezone)
  }

  saveStaffContext(context)
  return context
}

export async function signInStaff(input: {
  company: string
  email: string
  password: string
  remember: boolean
}) {
  if (!supabase) throw new Error(GENERIC_AUTH_ERROR)

  const company = normalizeCompany(input.company)
  setRememberSession(input.remember)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  })

  if (error || !data.user) throw new Error(GENERIC_AUTH_ERROR)

  try {
    return await loadStaffContext(data.user, company)
  } catch {
    await supabase.auth.signOut()
    clearStaffContext()
    throw new Error(GENERIC_AUTH_ERROR)
  }
}

export async function restoreStaffContext(user: User) {
  const cachedCompany = (
    window.localStorage.getItem('autobizmate-staff-context') ??
    window.sessionStorage.getItem('autobizmate-staff-context')
  )

  if (!cachedCompany) return null

  try {
    const parsed = JSON.parse(cachedCompany) as Partial<StaffContext>
    if (!parsed.company) return null
    return await loadStaffContext(user, parsed.company)
  } catch {
    clearStaffContext()
    return null
  }
}

export async function signOutStaff() {
  if (supabase) await supabase.auth.signOut()
  clearStaffContext()
  clearAllAuthStorage()
}

export { GENERIC_AUTH_ERROR }
