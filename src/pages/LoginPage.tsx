import { Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/providers/providerContexts'
import {
  GENERIC_AUTH_ERROR,
  isValidCompany,
  normalizeCompany,
} from '../features/auth/authService'
import { isSupabaseConfigured, supabaseConfigurationMessage } from '../lib/supabaseClient'

type FormErrors = Partial<Record<'company' | 'email' | 'password', string>>

export function LoginPage() {
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const errorId = useId()

  useEffect(() => {
    if (status === 'authorized') navigate('/staff', { replace: true })
  }, [navigate, status])

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (!company.trim()) nextErrors.company = 'Enter your company key.'
    else if (!isValidCompany(company)) {
      nextErrors.company = 'Use letters, numbers, underscores, or hyphens only.'
    }
    if (!email.trim()) nextErrors.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }
    if (!password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return
    if (!isSupabaseConfigured) {
      setFormError(supabaseConfigurationMessage)
      return
    }

    setSubmitting(true)
    try {
      await signIn({
        company: normalizeCompany(company),
        email,
        password,
        remember,
      })
      const returnPath =
        typeof location.state === 'object' &&
        location.state &&
        'from' in location.state &&
        typeof location.state.from === 'object' &&
        location.state.from &&
        'pathname' in location.state.from
          ? String(location.state.from.pathname)
          : '/staff'
      navigate(returnPath, { replace: true })
    } catch {
      setFormError(GENERIC_AUTH_ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-panel__intro">
          <span className="login-panel__icon">
            <KeyRound aria-hidden="true" />
          </span>
          <span className="eyebrow">Staff queue access</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage arrived customers and today’s live queue.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {!isSupabaseConfigured && (
            <div className="form-notice" role="note">
              <LockKeyhole aria-hidden="true" size={19} />
              <span>{supabaseConfigurationMessage}</span>
            </div>
          )}
          {formError && (
            <div className="form-error" id={errorId} role="alert">
              {formError}
            </div>
          )}

          <label className="form-field">
            <span>Company</span>
            <input
              name="company"
              autoComplete="organization"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              onBlur={() => setCompany((value) => normalizeCompany(value))}
              aria-invalid={Boolean(errors.company)}
              aria-describedby={errors.company ? 'company-error' : undefined}
              placeholder="your_company"
              disabled={submitting}
            />
            {errors.company && (
              <small className="field-error" id="company-error">
                {errors.company}
              </small>
            )}
          </label>

          <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              placeholder="you@example.com"
              disabled={submitting}
            />
            {errors.email && (
              <small className="field-error" id="email-error">
                {errors.email}
              </small>
            )}
          </label>

          <label className="form-field">
            <span>Password</span>
            <span className="password-control">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                disabled={submitting}
              />
              <button
                type="button"
                className="password-control__toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={submitting}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" size={19} />
                ) : (
                  <Eye aria-hidden="true" size={19} />
                )}
              </button>
            </span>
            {errors.password && (
              <small className="field-error" id="password-error">
                {errors.password}
              </small>
            )}
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={submitting}
            />
            <span>
              <strong>Remember me</strong>
              <small>Keep this staff session after the browser closes.</small>
            </span>
          </label>

          <button
            className="button button--primary button--wide"
            type="submit"
            disabled={submitting}
            aria-describedby={formError ? errorId : undefined}
          >
            {submitting ? (
              <>
                <span className="button__spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <p className="login-form__help">
            Access is limited to active staff linked to the company entered above.
          </p>
        </form>
      </section>

      <aside className="login-aside" aria-label="Queue access information">
        <span className="login-aside__kicker">Today at a glance</span>
        <h2>Your live queue, ready when you are.</h2>
        <div className="login-aside__mock">
          <span />
          <span />
          <span />
        </div>
        <ul>
          <li>See active services first</li>
          <li>Handle scheduled arrivals next</li>
          <li>Keep waiting-list customers in order</li>
        </ul>
        <Link to="/">Return to the public site</Link>
      </aside>
    </main>
  )
}
