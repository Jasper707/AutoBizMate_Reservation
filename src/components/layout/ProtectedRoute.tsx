import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/providers/providerContexts'
import { LoadingState } from '../common/LoadingState'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="auth-loading-page">
        <LoadingState
          title="Restoring your staff session"
          message="We are securely checking your access before opening the queue."
        />
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (status === 'unauthorized') {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
