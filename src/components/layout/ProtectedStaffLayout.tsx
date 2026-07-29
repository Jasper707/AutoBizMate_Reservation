import { LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/providerContexts'
import { ThemeToggle } from '../common/ThemeToggle'
import { AppLogo } from '../common/AppLogo'

export type StaffOutletContext = {
  setRefreshHandler: (handler: (() => void) | null) => void
  setRealtimeConnected: (connected: boolean) => void
}

import { useCallback, useState } from 'react'

export function ProtectedStaffLayout() {
  const { staff, signOut } = useAuth()
  const navigate = useNavigate()
  const [refreshHandler, setRefreshHandlerState] = useState<(() => void) | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const setRefreshHandler = useCallback((handler: (() => void) | null) => {
    setRefreshHandlerState(() => handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <div className="staff-header__inner">
          <AppLogo />
          <div className="staff-header__actions">
            <span
              className={`connection-state connection-state--${
                realtimeConnected ? 'connected' : 'disconnected'
              }`}
            >
              {realtimeConnected ? (
                <Wifi aria-hidden="true" size={16} />
              ) : (
                <WifiOff aria-hidden="true" size={16} />
              )}
              <span>{realtimeConnected ? 'Live' : 'Refresh available'}</span>
            </span>
            <button
              className="button button--quiet button--compact"
              type="button"
              onClick={() => refreshHandler?.()}
              disabled={!refreshHandler}
            >
              <RefreshCw aria-hidden="true" size={17} />
              <span>Refresh</span>
            </button>
            <ThemeToggle />
            <button
              className="icon-button"
              type="button"
              onClick={handleSignOut}
              aria-label={`Sign out ${staff?.displayName ?? ''}`}
              title="Sign out"
            >
              <LogOut aria-hidden="true" size={19} />
            </button>
          </div>
        </div>
      </header>
      <Outlet context={{ setRefreshHandler, setRealtimeConnected } satisfies StaffOutletContext} />
    </div>
  )
}
