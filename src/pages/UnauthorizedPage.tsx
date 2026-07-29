import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/providers/providerContexts'

export function UnauthorizedPage() {
  const { signOut } = useAuth()

  return (
    <main className="message-page">
      <span className="message-page__icon">
        <ShieldAlert aria-hidden="true" />
      </span>
      <span className="eyebrow">Staff access</span>
      <h1>Your account is signed in, but queue access is not available.</h1>
      <p>
        Ask the business administrator to confirm your active staff membership and
        employee assignment.
      </p>
      <div>
        <button className="button button--primary" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
        <Link className="button button--secondary" to="/">
          Return home
        </Link>
      </div>
    </main>
  )
}
